/**
 * One-time cleanup script: deletes all Firebase Auth users and Firestore data
 * EXCEPT the admin user with phone number +16505551234.
 *
 * Usage:
 *   1. Place your Firebase service account key at scripts/serviceAccountKey.json
 *   2. npm install firebase-admin  (inside the scripts/ folder or project root)
 *   3. Dry run first:   node scripts/cleanup-users.js --dry-run
 *   4. Live delete:     node scripts/cleanup-users.js
 */

const admin = require('firebase-admin');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const KEEP_PHONE = '+16505551234';
const DRY_RUN = process.argv.includes('--dry-run');

admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
});

const db = admin.firestore();
const auth = admin.auth();

async function getAllAuthUsers() {
  const users = [];
  let pageToken;
  do {
    const result = await auth.listUsers(1000, pageToken);
    users.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);
  return users;
}

async function deleteCollection(collectionName, fieldName, value) {
  const snap = await db.collection(collectionName).where(fieldName, '==', value).get();
  if (snap.empty) return 0;
  if (!DRY_RUN) {
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  return snap.size;
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN — nothing will be deleted ===\n' : '=== LIVE RUN — deleting data ===\n');

  // 1. Find the user to keep
  const keepUser = await auth.getUserByPhoneNumber(KEEP_PHONE);
  console.log(`Keeping user: ${keepUser.uid} (${KEEP_PHONE})\n`);

  // 2. Get all auth users
  const allUsers = await getAllAuthUsers();
  const usersToDelete = allUsers.filter((u) => u.uid !== keepUser.uid);
  console.log(`Total auth users: ${allUsers.length}`);
  console.log(`Users to delete: ${usersToDelete.length}\n`);

  // 3. Delete Firestore data for each user to delete
  for (const user of usersToDelete) {
    const phone = user.phoneNumber ?? user.email ?? user.uid;
    console.log(`Processing: ${phone} (${user.uid})`);

    const invoices = await deleteCollection('invoices', 'memberId', user.uid);
    const payments = await deleteCollection('payments', 'memberId', user.uid);

    // Delete Firestore user document
    const userDocRef = db.collection('users').doc(user.uid);
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
      if (!DRY_RUN) await userDocRef.delete();
      console.log(`  users doc:  deleted`);
    }

    console.log(`  invoices:   ${invoices} deleted`);
    console.log(`  payments:   ${payments} deleted`);
  }

  // 4. Delete all registration requests
  const reqSnap = await db.collection('registrationRequests').get();
  if (!DRY_RUN && !reqSnap.empty) {
    const batch = db.batch();
    reqSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  console.log(`\nregistrationRequests: ${reqSnap.size} deleted`);

  // 5. Delete Firebase Auth accounts
  if (usersToDelete.length > 0) {
    const uids = usersToDelete.map((u) => u.uid);
    if (!DRY_RUN) {
      const result = await auth.deleteUsers(uids);
      console.log(`\nAuth accounts deleted: ${result.successCount}`);
      if (result.failureCount > 0) {
        console.error('Failed to delete some auth accounts:', result.errors);
      }
    } else {
      console.log(`\n[DRY RUN] Would delete ${uids.length} auth accounts`);
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface InvoiceConfig {
  generationDay: number;
  dueDay: number;
  membershipType: string;
}

async function buildAndCreateInvoices(
  members: admin.firestore.DocumentSnapshot[],
  config: InvoiceConfig,
  now: Date
): Promise<number> {
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Look up the base amount from membershipFees
  const feeSnap = await db
    .collection('membershipFees')
    .where('membershipType', '==', config.membershipType)
    .limit(1)
    .get();

  const baseAmount: number = feeSnap.empty ? 40 : (feeSnap.docs[0].data().amount ?? 40);

  // Build due date: dueDay of current month
  const dueDate = new Date(now.getFullYear(), now.getMonth(), config.dueDay);

  let created = 0;
  const batch = db.batch();
  const fcmTokens: { token: string; memberName: string }[] = [];

  for (const memberDoc of members) {
    const member = memberDoc.data();
    if (!member) continue;
    const memberId = memberDoc.id;
    const memberName = `${member.firstName} ${member.lastName}`;

    // Check if invoice for this period already exists
    const existing = await db
      .collection('invoices')
      .where('memberId', '==', memberId)
      .where('period', '==', period)
      .limit(1)
      .get();

    if (!existing.empty) continue;

    // Calculate past due: sum of all unpaid prior invoices
    const unpaidSnap = await db
      .collection('invoices')
      .where('memberId', '==', memberId)
      .where('status', 'in', ['pending', 'overdue'])
      .get();

    const pastDueAmount = unpaidSnap.docs.reduce(
      (sum, doc) => sum + (doc.data().amount ?? 0),
      0
    );

    const amount = baseAmount + pastDueAmount;

    const invoiceRef = db.collection('invoices').doc();
    batch.set(invoiceRef, {
      memberId,
      memberName,
      baseAmount,
      pastDueAmount,
      amount,
      period,
      invoiceDate: admin.firestore.Timestamp.fromDate(now),
      dueDate: admin.firestore.Timestamp.fromDate(dueDate),
      status: 'pending',
      autoPayEnabled: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    created++;

    if (member.fcmToken) {
      fcmTokens.push({ token: member.fcmToken, memberName });
    }
  }

  await batch.commit();

  // Send push notifications individually so each member sees their own amount
  for (const { token } of fcmTokens) {
    await admin.messaging().send({
      token,
      notification: {
        title: 'New Invoice Generated',
        body: `Your invoice for ${period} is ready. Please open the app to view the amount due.`,
      },
      data: { type: 'invoice', period },
    }).catch(() => {}); // ignore stale tokens
  }

  return created;
}

// Scheduled: runs daily, generates invoices on the configured day
export const generateMonthlyInvoices = onSchedule('every day 08:00', async () => {
  const configDoc = await db.collection('invoiceConfig').doc('default').get();
  if (!configDoc.exists) {
    console.log('No invoice config found, skipping generation.');
    return;
  }

  const config = configDoc.data() as InvoiceConfig;
  const now = new Date();

  if (now.getDate() !== config.generationDay) {
    console.log(`Today is day ${now.getDate()}, generation day is ${config.generationDay}. Skipping.`);
    return;
  }

  const membersSnap = await db
    .collection('users')
    .where('role', '==', 'Member')
    .where('status', '==', 'active')
    .get();

  const created = await buildAndCreateInvoices(membersSnap.docs as admin.firestore.DocumentSnapshot[], config, now);
  console.log(`Monthly invoice generation complete. Created: ${created}`);
});

// On-demand: admin triggers generation for one or all members
export const generateInvoicesOnDemand = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== 'Administrator') {
    throw new HttpsError('permission-denied', 'Admins only.');
  }

  const configDoc = await db.collection('invoiceConfig').doc('default').get();
  if (!configDoc.exists) throw new HttpsError('failed-precondition', 'Invoice configuration not set up.');

  const config = configDoc.data() as InvoiceConfig;
  const { memberId } = request.data as { memberId?: string | null };

  let memberDocs: admin.firestore.DocumentSnapshot[];
  if (memberId) {
    const memberDoc = await db.collection('users').doc(memberId).get();
    if (!memberDoc.exists) throw new HttpsError('not-found', 'Member not found.');
    memberDocs = [memberDoc];
  } else {
    const snap = await db
      .collection('users')
      .where('role', '==', 'Member')
      .where('status', '==', 'active')
      .get();
    memberDocs = snap.docs;
  }

  const created = await buildAndCreateInvoices(memberDocs, config, new Date());
  return { created };
});

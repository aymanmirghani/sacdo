import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { sendEmail } from '../notifications/email';
import { sendSMS, isTestPhoneNumber } from '../notifications/sms';

const gmailAppPassword = defineSecret('GMAIL_APP_PASSWORD');
const fromEmail = defineSecret('FROM_EMAIL');
const twilioAccountSid = defineSecret('TWILIO_ACCOUNT_SID');
const twilioAuthToken = defineSecret('TWILIO_AUTH_TOKEN');
const twilioPhoneNumber = defineSecret('TWILIO_PHONE_NUMBER');

const db = admin.firestore();

// Notify admins when a new registration request arrives
export const onNewRegistrationRequest = onDocumentCreated(
  { document: 'registrationRequests/{requestId}', secrets: [twilioAccountSid, twilioAuthToken, twilioPhoneNumber, gmailAppPassword, fromEmail] },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const adminsSnap = await db
      .collection('users')
      .where('IsAdmin', '==', true)
      .where('status', '==', 'active')
      .get();

    const tokens: string[] = [];
    const phones: string[] = [];
    adminsSnap.docs.forEach((doc) => {
      const adminUser = doc.data();
      if (adminUser.fcmToken) tokens.push(adminUser.fcmToken);
      if (adminUser.phone && !isTestPhoneNumber(adminUser.phone)) phones.push(adminUser.phone);
    });

    const applicant = `${data.firstName} ${data.lastName}`.trim();

    // Push only reaches admins running the native app — the PWA never registers
    // an FCM token — so the SMS below is what admins actually receive.
    // Sent one token at a time: sendMulticast() posts to the FCM /batch endpoint,
    // which Google has retired, so it now fails with a 404 and aborts the handler.
    for (const token of tokens) {
      try {
        await admin.messaging().send({
          token,
          notification: {
            title: 'New Membership Request',
            body: `${applicant} has requested to join.`,
          },
          data: { requestId: event.params.requestId },
        });
      } catch (err: any) {
        console.error('Failed to send admin push notification:', err.message);
      }
    }

    // Text every active admin. One bad number must not stop the others.
    const smsBody = `SACDO: New membership request from ${applicant}. Open the SACDO app to review it.`;
    const results = await Promise.allSettled(phones.map((phone) => sendSMS(phone, smsBody)));
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`Failed to SMS admin ${phones[i]}:`, result.reason?.message ?? result.reason);
      }
    });

    const delivered = results.filter((r) => r.status === 'fulfilled').length;
    console.log(`New registration request from ${applicant}: notified ${delivered}/${phones.length} admin(s) by SMS.`);
  }
);

export const approveRegistration = onCall({ secrets: [twilioAccountSid, twilioAuthToken, twilioPhoneNumber, gmailAppPassword, fromEmail] }, async (request) => {
  const { requestId, adminId } = request.data;
  if (!requestId || !adminId) throw new HttpsError('invalid-argument', 'Missing parameters.');

  const requestRef = db.collection('registrationRequests').doc(requestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) throw new HttpsError('not-found', 'Request not found.');

  const req = requestSnap.data()!;
  if (req.status !== 'pending') throw new HttpsError('failed-precondition', 'Request is not pending.');

  let authUser;
  try {
    authUser = await admin.auth().createUser({
      email: req.email,
      phoneNumber: req.phone,
      displayName: `${req.firstName} ${req.lastName}`,
    });
  } catch (e: any) {
    throw new HttpsError('internal', `Failed to create auth user: ${e.message}`);
  }

  await db.collection('users').doc(authUser.uid).set({
    firstName: req.firstName,
    lastName: req.lastName,
    phone: req.phone,
    email: req.email,
    role: 'Member',
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await requestRef.update({
    status: 'approved',
    reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewedBy: adminId,
  });

  const message = 'Congratulations! Your SACDO membership request has been approved. You can now log in to the SACDO app.';
  await Promise.allSettled([
    sendSMS(req.phone, message),
    sendEmail(req.email, 'SACDO Membership Approved', `<p>${message}</p>`),
  ]);

  return { success: true };
});

export const rejectRegistration = onCall({ secrets: [twilioAccountSid, twilioAuthToken, twilioPhoneNumber, gmailAppPassword, fromEmail] }, async (request) => {
  const { requestId, adminId, reason } = request.data;
  if (!requestId || !adminId || !reason) throw new HttpsError('invalid-argument', 'Missing parameters.');

  const requestRef = db.collection('registrationRequests').doc(requestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) throw new HttpsError('not-found', 'Request not found.');

  const req = requestSnap.data()!;
  if (req.status !== 'pending') throw new HttpsError('failed-precondition', 'Request is not pending.');

  await requestRef.update({
    status: 'rejected',
    rejectionReason: reason,
    reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewedBy: adminId,
  });

  const message = `Your SACDO membership request was not approved. Reason: ${reason}`;
  await Promise.allSettled([
    sendSMS(req.phone, message),
    sendEmail(req.email, 'SACDO Membership Request Update', `<p>${message}</p>`),
  ]);

  return { success: true };
});

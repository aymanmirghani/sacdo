import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { sendEmail } from '../notifications/email';
import { sendSMS } from '../notifications/sms';

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
      .where('role', '==', 'Administrator')
      .where('status', '==', 'active')
      .get();

    const tokens: string[] = [];
    adminsSnap.docs.forEach((doc) => {
      const fcmToken = doc.data().fcmToken;
      if (fcmToken) tokens.push(fcmToken);
    });

    if (tokens.length > 0) {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title: 'New Membership Request',
          body: `${data.firstName} ${data.lastName} has requested to join.`,
        },
        data: { requestId: event.params.requestId },
      });
    }
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

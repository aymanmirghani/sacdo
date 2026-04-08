import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { sendEmail } from '../notifications/email';

const sendgridApiKey = defineSecret('SENDGRID_API_KEY');
const fromEmail = defineSecret('FROM_EMAIL');

const db = admin.firestore();
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export const sendEmailOTP = onCall({ secrets: [sendgridApiKey, fromEmail] }, async (request) => {
  const { email } = request.data;
  if (!email) throw new HttpsError('invalid-argument', 'Email is required.');

  const normalizedEmail = email.trim().toLowerCase();
  const snap = await db.collection('users').where('email', '==', normalizedEmail).where('status', '==', 'active').limit(1).get();
  if (snap.empty) {
    throw new HttpsError('not-found', 'Not able to validate your information.');
  }

  const otp = generateOTP();
  const hash = hashOTP(otp);
  const expiresAt = Date.now() + OTP_EXPIRY_MS;

  await db.collection('otpTokens').doc(normalizedEmail).set({ hash, expiresAt });

  try {
    await sendEmail(
      email,
      'Your SACDO Verification Code',
      `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p>`
    );
  } catch (err: any) {
    console.error('Email error:', err?.message ?? err);
    throw new HttpsError('internal', 'Failed to send verification email. Please try again.');
  }

  return { success: true };
});

export const verifyEmailOTP = onCall(async (request) => {
  const { email, code } = request.data;
  if (!email || !code) throw new HttpsError('invalid-argument', 'Email and code are required.');

  const normalizedEmail = email.trim().toLowerCase();
  const tokenDoc = await db.collection('otpTokens').doc(normalizedEmail).get();
  if (!tokenDoc.exists) {
    throw new HttpsError('not-found', 'Not able to validate your information.');
  }

  const { hash, expiresAt } = tokenDoc.data()!;
  if (Date.now() > expiresAt) {
    await tokenDoc.ref.delete();
    throw new HttpsError('deadline-exceeded', 'Verification code has expired.');
  }

  if (hashOTP(code) !== hash) {
    throw new HttpsError('unauthenticated', 'Not able to validate your information.');
  }

  await tokenDoc.ref.delete();

  const snap = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
  if (snap.empty) {
    throw new HttpsError('not-found', 'Not able to validate your information.');
  }

  const userId = snap.docs[0].id;
  const customToken = await admin.auth().createCustomToken(userId);

  return { customToken };
});

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { sendSMS } from '../notifications/sms';

const twilioAccountSid = defineSecret('TWILIO_ACCOUNT_SID');
const twilioAuthToken = defineSecret('TWILIO_AUTH_TOKEN');
const twilioPhoneNumber = defineSecret('TWILIO_PHONE_NUMBER');

const db = admin.firestore();
const OTP_EXPIRY_MS = 5 * 60 * 1000;

// Test phone numbers with predefined codes (mirrors Firebase test phone number feature)
const TEST_PHONE_NUMBERS: Record<string, string> = {
  '+16505551234': '123456',
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export const sendPhoneOTP = onCall(
  { secrets: [twilioAccountSid, twilioAuthToken, twilioPhoneNumber] },
  async (request) => {
    const { phone } = request.data;
    if (!phone) throw new HttpsError('invalid-argument', 'Phone number is required.');

    const snap = await db
      .collection('users')
      .where('phone', '==', phone)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snap.empty) {
      throw new HttpsError('not-found', 'Not able to validate your information.');
    }

    const testCode = TEST_PHONE_NUMBERS[phone];
    const otp = testCode ?? generateOTP();
    const hash = hashOTP(otp);
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    await db.collection('otpTokens').doc(phone).set({ hash, expiresAt });

    if (!testCode) {
      try {
        await sendSMS(phone, `Your SACDO verification code is: ${otp}. It expires in 5 minutes.`);
      } catch (err: any) {
        console.error('SMS error:', err?.message ?? err);
        throw new HttpsError('internal', 'Failed to send verification SMS. Please try again.');
      }
    }

    return { success: true };
  }
);

export const verifyPhoneOTP = onCall(async (request) => {
  const { phone, code } = request.data;
  if (!phone || !code) throw new HttpsError('invalid-argument', 'Phone and code are required.');

  const tokenDoc = await db.collection('otpTokens').doc(phone).get();
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

  const snap = await db.collection('users').where('phone', '==', phone).limit(1).get();
  if (snap.empty) {
    throw new HttpsError('not-found', 'Not able to validate your information.');
  }

  const userId = snap.docs[0].id;
  const customToken = await admin.auth().createCustomToken(userId);

  return { customToken };
});

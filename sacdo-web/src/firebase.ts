import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// TODO: Register a Web App in Firebase Console (Project: sacdo-app-prod)
// and replace the appId and measurementId below.
// Console → Project Settings → Your apps → Add app → Web
const firebaseConfig = {
  apiKey: 'AIzaSyB-BwP17mPG0tt9z9wqhUQgU1fcMKAyBss',
  authDomain: 'sacdo-app-prod.firebaseapp.com',
  projectId: 'sacdo-app-prod',
  storageBucket: 'sacdo-app-prod.firebasestorage.app',
  messagingSenderId: '428518957351',
  appId: '1:428518957351:web:8a4806e866364772fa0902', // from Firebase Console
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Enable offline data persistence — silently ignored if already enabled or unsupported
enableIndexedDbPersistence(db).catch(() => {});

export const Collections = {
  USERS: 'users',
  REGISTRATION_REQUESTS: 'registrationRequests',
  MEMBERSHIP_FEES: 'membershipFees',
  PAYMENT_TYPES: 'paymentTypes',
  PAYMENTS: 'payments',
  EVENTS: 'events',
  OTP_TOKENS: 'otpTokens',
  INVOICES: 'invoices',
  INVOICE_CONFIG: 'invoiceConfig',
  AUDIT_LOG: 'auditLog',
} as const;

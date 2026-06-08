import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions, Collections } from '../firebase';
import type { User } from '../types';

export async function sendPhoneOTP(phoneNumber: string): Promise<void> {
  const fn = httpsCallable(functions, 'sendPhoneOTP');
  await fn({ phone: phoneNumber });
}

export async function verifyPhoneOTP(phone: string, code: string): Promise<User | null> {
  const fn = httpsCallable(functions, 'verifyPhoneOTP');
  const result = await fn({ phone, code });
  const { customToken } = result.data as { customToken: string };
  await signInWithCustomToken(auth, customToken);
  return loadCurrentUser();
}

export async function sendEmailOTP(email: string): Promise<void> {
  const fn = httpsCallable(functions, 'sendEmailOTP');
  await fn({ email });
}

export async function verifyEmailOTP(email: string, code: string): Promise<User | null> {
  const fn = httpsCallable(functions, 'verifyEmailOTP');
  const result = await fn({ email, code });
  const { customToken } = result.data as { customToken: string };
  await signInWithCustomToken(auth, customToken);
  return loadCurrentUser();
}

export async function loadCurrentUser(): Promise<User | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;

  const snap = await getDoc(doc(db, Collections.USERS, firebaseUser.uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    id: snap.id,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    email: data.email,
    role: data.role,
    isAdmin: data.IsAdmin ?? false,
    status: data.status,
    createdAt: data.createdAt?.toDate(),
    stripeCustomerId: data.stripeCustomerId,
    stripePaymentMethodId: data.stripePaymentMethodId,
  };
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

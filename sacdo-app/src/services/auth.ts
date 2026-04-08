import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { Collections } from './firebase';
import { User } from '../types';

// Phone OTP — uses Firebase Auth built-in
let _phoneConfirmation: any = null;

export async function sendPhoneOTP(phoneNumber: string) {
  _phoneConfirmation = await auth().signInWithPhoneNumber(phoneNumber);
  return _phoneConfirmation;
}

export function getPhoneConfirmation() {
  return _phoneConfirmation;
}

export async function verifyPhoneOTP(confirmation: any, code: string) {
  await confirmation.confirm(code);
  return loadCurrentUser();
}

// Email OTP — uses Cloud Function
export async function sendEmailOTP(email: string) {
  const fn = functions().httpsCallable('sendEmailOTP');
  await fn({ email });
}

export async function verifyEmailOTP(email: string, code: string): Promise<User | null> {
  const fn = functions().httpsCallable('verifyEmailOTP');
  const result = await fn({ email, code });
  const { customToken } = result.data as { customToken: string };
  await auth().signInWithCustomToken(customToken);
  return loadCurrentUser();
}

export async function loadCurrentUser(): Promise<User | null> {
  const firebaseUser = auth().currentUser;
  if (!firebaseUser) return null;

  const doc = await firestore()
    .collection(Collections.USERS)
    .doc(firebaseUser.uid)
    .get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    email: data.email,
    role: data.role,
    status: data.status,
    createdAt: data.createdAt?.toDate(),
  };
}

export async function saveFCMToken(userId: string, token: string) {
  await firestore().collection(Collections.USERS).doc(userId).update({ fcmToken: token });
}

export async function signOut() {
  await auth().signOut();
}

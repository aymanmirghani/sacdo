import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
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
    isAdmin: data.IsAdmin ?? false,
    status: data.status,
    createdAt: data.createdAt?.toDate(),
    stripeCustomerId: data.stripeCustomerId,
    stripePaymentMethodId: data.stripePaymentMethodId,
  };
}

export async function saveFCMToken(userId: string, token: string) {
  await firestore().collection(Collections.USERS).doc(userId).update({ fcmToken: token });
}

export async function signOut() {
  await auth().signOut();
}

// Called when user taps "Sign Out" from within the app.
// If biometric is enabled, locks the app without ending the Firebase session
// so the user can unlock with biometrics. Falls back to full sign out otherwise.
export async function lockApp(actions: {
  setUser: (user: User | null) => void;
  setBiometricLocked: (locked: boolean) => void;
  clear: () => void;
}): Promise<void> {
  const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
  if (biometricEnabled === 'true') {
    const supported = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (supported && enrolled) {
      actions.setUser(null);
      actions.setBiometricLocked(true);
      return;
    }
  }
  await auth().signOut();
  actions.clear();
}

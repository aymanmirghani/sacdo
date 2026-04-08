import firebase from '@react-native-firebase/app';
import appCheck from '@react-native-firebase/app-check';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import messaging from '@react-native-firebase/messaging';

setTimeout(() => {
  const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
  provider.configure({
    android: {
      provider: __DEV__ ? 'debug' : 'playIntegrity',
      debugToken: '8E6DEC90-B10E-4FA7-8886-720A5AEBC5C3',
    },
    apple: { provider: 'appAttestWithDeviceCheckFallback' },
  });
  appCheck().initializeAppCheck({ provider, isTokenAutoRefreshEnabled: true });
}, 0);

export { firebase, auth, firestore, functions, messaging };

export const Collections = {
  USERS: 'users',
  REGISTRATION_REQUESTS: 'registrationRequests',
  MEMBERSHIP_FEES: 'membershipFees',
  PAYMENT_TYPES: 'paymentTypes',
  PAYMENTS: 'payments',
  EVENTS: 'events',
  OTP_TOKENS: 'otpTokens',
} as const;

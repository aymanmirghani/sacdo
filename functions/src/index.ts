import * as admin from 'firebase-admin';

admin.initializeApp();

export { sendEmailOTP, verifyEmailOTP } from './auth/emailOTP';
export { sendPhoneOTP, verifyPhoneOTP } from './auth/phoneOTP';
export { onNewRegistrationRequest, approveRegistration, rejectRegistration } from './members/registration';
export { generateMonthlyInvoices, generateInvoicesOnDemand } from './invoices/invoices';
export { createPaymentIntent, createSetupIntent, handleStripeWebhook } from './payments/stripe';

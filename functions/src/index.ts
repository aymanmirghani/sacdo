import * as admin from 'firebase-admin';

admin.initializeApp();

export { sendEmailOTP, verifyEmailOTP } from './auth/emailOTP';
export { onNewRegistrationRequest, approveRegistration, rejectRegistration } from './members/registration';
export { generateMonthlyInvoices, generateInvoicesOnDemand } from './invoices/invoices';

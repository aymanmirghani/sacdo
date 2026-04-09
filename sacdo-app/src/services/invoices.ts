import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { Collections } from './firebase';
import { Invoice, InvoiceConfig } from '../types';

function toInvoice(doc: any): Invoice {
  const d = doc.data();
  return {
    id: doc.id,
    memberId: d.memberId,
    memberName: d.memberName,
    baseAmount: d.baseAmount,
    pastDueAmount: d.pastDueAmount,
    amount: d.amount,
    period: d.period,
    invoiceDate: d.invoiceDate?.toDate(),
    dueDate: d.dueDate?.toDate(),
    status: d.status,
    paidDate: d.paidDate?.toDate(),
    paymentMethod: d.paymentMethod,
    paymentReference: d.paymentReference,
    notes: d.notes,
    autoPayEnabled: d.autoPayEnabled ?? false,
  };
}

export async function getInvoiceConfig(): Promise<InvoiceConfig | null> {
  const doc = await firestore().collection(Collections.INVOICE_CONFIG).doc('default').get();
  const d = doc.data();
  if (!d) return null;
  return {
    generationDay: d.generationDay,
    dueDay: d.dueDay,
    membershipType: d.membershipType,
    updatedAt: d.updatedAt?.toDate(),
    updatedBy: d.updatedBy,
  };
}

export async function saveInvoiceConfig(
  config: Pick<InvoiceConfig, 'generationDay' | 'dueDay' | 'membershipType'>,
  adminId: string
) {
  await firestore()
    .collection(Collections.INVOICE_CONFIG)
    .doc('default')
    .set({
      ...config,
      updatedAt: firestore.FieldValue.serverTimestamp(),
      updatedBy: adminId,
    });
}

export async function getMemberInvoices(memberId: string): Promise<Invoice[]> {
  const snap = await firestore()
    .collection(Collections.INVOICES)
    .where('memberId', '==', memberId)
    .orderBy('invoiceDate', 'desc')
    .limit(12)
    .get();
  return snap.docs.map(toInvoice);
}

export async function getAllInvoicesForMember(memberId: string): Promise<Invoice[]> {
  const snap = await firestore()
    .collection(Collections.INVOICES)
    .where('memberId', '==', memberId)
    .orderBy('invoiceDate', 'desc')
    .get();
  return snap.docs.map(toInvoice);
}

export async function markInvoicePaid(
  invoiceId: string,
  data: { paymentMethod: string; paymentReference?: string; notes?: string }
) {
  await firestore()
    .collection(Collections.INVOICES)
    .doc(invoiceId)
    .update({
      status: 'paid',
      paidDate: firestore.FieldValue.serverTimestamp(),
      paymentMethod: data.paymentMethod,
      paymentReference: data.paymentReference ?? '',
      notes: data.notes ?? '',
    });
}

export async function updateAutoPayPreference(invoiceId: string, enabled: boolean) {
  await firestore()
    .collection(Collections.INVOICES)
    .doc(invoiceId)
    .update({ autoPayEnabled: enabled });
}

export async function generateInvoicesOnDemand(memberId?: string): Promise<{ created: number }> {
  const fn = functions().httpsCallable('generateInvoicesOnDemand');
  const result = await fn({ memberId: memberId ?? null });
  return result.data as { created: number };
}

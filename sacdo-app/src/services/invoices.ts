import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { Collections } from './firebase';
import { Invoice, InvoiceConfig, InvoiceFilter } from '../types';
import { logAuditEntry } from './audit';

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
    generatedBy: d.generatedBy,
    processedBy: d.processedBy,
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
  admin: { id: string; name: string }
) {
  const oldDoc = await firestore().collection(Collections.INVOICE_CONFIG).doc('default').get();
  const old = oldDoc.data();

  await firestore()
    .collection(Collections.INVOICE_CONFIG)
    .doc('default')
    .set({
      ...config,
      updatedAt: firestore.FieldValue.serverTimestamp(),
      updatedBy: admin.id,
    });

  const fields: Array<keyof typeof config> = ['generationDay', 'dueDay', 'membershipType'];
  const changes = fields
    .filter((f) => !old || old[f] !== config[f])
    .map((f) => ({
      field: f,
      oldValue: old ? (old[f] ?? null) : null,
      newValue: config[f],
    }));

  if (changes.length > 0) {
    await logAuditEntry({
      adminId: admin.id,
      adminName: admin.name,
      action: 'invoice_config_updated',
      collection: Collections.INVOICE_CONFIG,
      itemId: 'default',
      itemDescription: 'Invoice Configuration',
      changes,
    });
  }
}

export async function getMemberTotalDue(memberId: string): Promise<number> {
  const snap = await firestore()
    .collection(Collections.INVOICES)
    .where('memberId', '==', memberId)
    .where('status', 'in', ['pending', 'overdue'])
    .get();
  return snap.docs.reduce((sum, doc) => sum + (doc.data().amount ?? 0), 0);
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
  data: { paymentMethod: string; paymentReference?: string; notes?: string; processedBy: string }
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
      processedBy: data.processedBy,
    });
}

export async function updateAutoPayPreference(invoiceId: string, enabled: boolean) {
  await firestore()
    .collection(Collections.INVOICES)
    .doc(invoiceId)
    .update({ autoPayEnabled: enabled });
}

export async function generateInvoicesOnDemand(memberId?: string, period?: string): Promise<{ created: number }> {
  const fn = functions().httpsCallable('generateInvoicesOnDemand');
  const result = await fn({ memberId: memberId ?? null, period: period ?? null });
  return result.data as { created: number };
}

export async function createPaymentIntent(invoiceId: string): Promise<{ clientSecret: string }> {
  const fn = functions().httpsCallable('createPaymentIntent');
  const result = await fn({ invoiceId });
  return result.data as { clientSecret: string };
}

export async function createSetupIntent(): Promise<{ setupIntentClientSecret: string }> {
  const fn = functions().httpsCallable('createSetupIntent');
  const result = await fn({});
  return result.data as { setupIntentClientSecret: string };
}

export interface DashboardStats {
  activeMembers: number;
  thisMonth: { count: number; amount: number };
  lastMonth: { count: number; amount: number };
  pending: { count: number; amount: number };
  overdue: { count: number; amount: number };
  paidThisMonth: { count: number; amount: number };
  paidLastMonth: { count: number; amount: number };
}

function currentAndLastPeriod() {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastP = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;
  return { current, last: lastP };
}

function sumAmount(docs: any[]): number {
  return docs.reduce((s, d) => s + (d.data().amount ?? 0), 0);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { current, last } = currentAndLastPeriod();

  const [usersSnap, thisMonthSnap, lastMonthSnap, pendingSnap, overdueSnap] = await Promise.all([
    firestore().collection(Collections.USERS).where('status', '==', 'active').get(),
    firestore().collection(Collections.INVOICES).where('period', '==', current).get(),
    firestore().collection(Collections.INVOICES).where('period', '==', last).get(),
    firestore().collection(Collections.INVOICES).where('status', '==', 'pending').get(),
    firestore().collection(Collections.INVOICES).where('status', '==', 'overdue').get(),
  ]);

  const thisMonthDocs = thisMonthSnap.docs;
  const lastMonthDocs = lastMonthSnap.docs;
  const paidThisDocs = thisMonthDocs.filter((d) => d.data().status === 'paid');
  const paidLastDocs = lastMonthDocs.filter((d) => d.data().status === 'paid');

  return {
    activeMembers: usersSnap.size,
    thisMonth: { count: thisMonthDocs.length, amount: sumAmount(thisMonthDocs) },
    lastMonth: { count: lastMonthDocs.length, amount: sumAmount(lastMonthDocs) },
    pending: { count: pendingSnap.size, amount: sumAmount(pendingSnap.docs) },
    overdue: { count: overdueSnap.size, amount: sumAmount(overdueSnap.docs) },
    paidThisMonth: { count: paidThisDocs.length, amount: sumAmount(paidThisDocs) },
    paidLastMonth: { count: paidLastDocs.length, amount: sumAmount(paidLastDocs) },
  };
}

export async function getInvoicesByFilter(filter: InvoiceFilter): Promise<Invoice[]> {
  const { current, last } = currentAndLastPeriod();

  switch (filter) {
    case 'generatedThisMonth': {
      const snap = await firestore().collection(Collections.INVOICES).where('period', '==', current).get();
      return snap.docs.map(toInvoice);
    }
    case 'generatedLastMonth': {
      const snap = await firestore().collection(Collections.INVOICES).where('period', '==', last).get();
      return snap.docs.map(toInvoice);
    }
    case 'pending': {
      const snap = await firestore().collection(Collections.INVOICES).where('status', '==', 'pending').get();
      return snap.docs.map(toInvoice);
    }
    case 'overdue': {
      const snap = await firestore().collection(Collections.INVOICES).where('status', '==', 'overdue').get();
      return snap.docs.map(toInvoice);
    }
    case 'paidThisMonth': {
      const snap = await firestore().collection(Collections.INVOICES).where('period', '==', current).get();
      return snap.docs.filter((d) => d.data().status === 'paid').map(toInvoice);
    }
    case 'paidLastMonth': {
      const snap = await firestore().collection(Collections.INVOICES).where('period', '==', last).get();
      return snap.docs.filter((d) => d.data().status === 'paid').map(toInvoice);
    }
  }
}

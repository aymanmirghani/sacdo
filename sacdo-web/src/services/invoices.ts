import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, Collections } from '../firebase';
import { logAuditEntry } from './audit';
import type { Invoice, InvoiceConfig } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toInvoice(snap: any): Invoice {
  const d = snap.data();
  return {
    id: snap.id,
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

function toPeriod(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentAndLastPeriod() {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { current: toPeriod(now), last: toPeriod(last) };
}

// ─── Generation periods ───────────────────────────────────────────────────────
// Admins may generate invoices for the current month, the 6 months before it,
// and the 6 months after it.
export const PERIOD_MONTHS_BACK = 6;
export const PERIOD_MONTHS_FORWARD = 6;

export type PeriodGroup = 'Current month' | 'Past 6 months' | 'Next 6 months';

export interface PeriodOption {
  value: string; // YYYY-MM
  label: string; // e.g. "October 2026"
  group: PeriodGroup;
}

export function getCurrentPeriod(): string {
  return toPeriod(new Date());
}

/** Current month first, then the recent past, then upcoming months. */
export function getPeriodOptions(): PeriodOption[] {
  const now = new Date();
  const offsets = [
    0,
    ...Array.from({ length: PERIOD_MONTHS_BACK }, (_, i) => -(i + 1)),
    ...Array.from({ length: PERIOD_MONTHS_FORWARD }, (_, i) => i + 1),
  ];

  return offsets.map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return {
      value: toPeriod(d),
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      group:
        offset === 0 ? 'Current month' : offset < 0 ? 'Past 6 months' : 'Next 6 months',
    } as PeriodOption;
  });
}

// ─── Member ───────────────────────────────────────────────────────────────────

export async function getMemberTotalDue(memberId: string): Promise<number> {
  const q = query(
    collection(db, Collections.INVOICES),
    where('memberId', '==', memberId),
    where('status', 'in', ['pending', 'overdue'])
  );
  const snap = await getDocs(q);
  return snap.docs.reduce((sum, d) => sum + (d.data().amount ?? 0), 0);
}

export async function getMemberInvoices(memberId: string): Promise<Invoice[]> {
  const q = query(
    collection(db, Collections.INVOICES),
    where('memberId', '==', memberId),
    orderBy('invoiceDate', 'desc'),
    limit(12)
  );
  const snap = await getDocs(q);
  return snap.docs.map(toInvoice);
}

export async function getAllInvoicesForMember(memberId: string): Promise<Invoice[]> {
  const q = query(
    collection(db, Collections.INVOICES),
    where('memberId', '==', memberId),
    orderBy('invoiceDate', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(toInvoice);
}

export async function markInvoicePaid(
  invoiceId: string,
  data: { paymentMethod: string; paymentReference?: string; notes?: string; processedBy: string }
): Promise<void> {
  await updateDoc(doc(db, Collections.INVOICES, invoiceId), {
    status: 'paid',
    paidDate: serverTimestamp(),
    paymentMethod: data.paymentMethod,
    paymentReference: data.paymentReference ?? '',
    notes: data.notes ?? '',
    processedBy: data.processedBy,
  });
}

export async function updateAutoPayPreference(invoiceId: string, enabled: boolean): Promise<void> {
  await updateDoc(doc(db, Collections.INVOICES, invoiceId), { autoPayEnabled: enabled });
}

export async function createPaymentIntent(invoiceId: string): Promise<{ clientSecret: string }> {
  const fn = httpsCallable(functions, 'createPaymentIntent');
  const result = await fn({ invoiceId });
  return result.data as { clientSecret: string };
}

export async function createSetupIntent(): Promise<{ setupIntentClientSecret: string }> {
  const fn = httpsCallable(functions, 'createSetupIntent');
  const result = await fn({});
  return result.data as { setupIntentClientSecret: string };
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  activeMembers: number;
  thisMonth: { count: number; amount: number };
  lastMonth: { count: number; amount: number };
  pending: { count: number; amount: number };
  overdue: { count: number; amount: number };
  paidThisMonth: { count: number; amount: number };
  paidLastMonth: { count: number; amount: number };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { current, last } = currentAndLastPeriod();

  const [usersSnap, thisSnap, lastSnap, pendingSnap, overdueSnap] = await Promise.all([
    getDocs(query(collection(db, Collections.USERS), where('status', '==', 'active'))),
    getDocs(query(collection(db, Collections.INVOICES), where('period', '==', current))),
    getDocs(query(collection(db, Collections.INVOICES), where('period', '==', last))),
    getDocs(query(collection(db, Collections.INVOICES), where('status', '==', 'pending'))),
    getDocs(query(collection(db, Collections.INVOICES), where('status', '==', 'overdue'))),
  ]);

  const sum = (docs: any[]) => docs.reduce((s, d) => s + (d.data().amount ?? 0), 0);
  const thisDocs = thisSnap.docs;
  const lastDocs = lastSnap.docs;
  const paidThis = thisDocs.filter((d) => d.data().status === 'paid');
  const paidLast = lastDocs.filter((d) => d.data().status === 'paid');

  return {
    activeMembers: usersSnap.size,
    thisMonth: { count: thisDocs.length, amount: sum(thisDocs) },
    lastMonth: { count: lastDocs.length, amount: sum(lastDocs) },
    pending: { count: pendingSnap.size, amount: sum(pendingSnap.docs) },
    overdue: { count: overdueSnap.size, amount: sum(overdueSnap.docs) },
    paidThisMonth: { count: paidThis.length, amount: sum(paidThis) },
    paidLastMonth: { count: paidLast.length, amount: sum(paidLast) },
  };
}

export async function getInvoiceConfig(): Promise<InvoiceConfig | null> {
  const snap = await getDoc(doc(db, Collections.INVOICE_CONFIG, 'default'));
  if (!snap.exists()) return null;
  const d = snap.data();
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
): Promise<void> {
  await setDoc(
    doc(db, Collections.INVOICE_CONFIG, 'default'),
    { ...config, updatedAt: serverTimestamp(), updatedBy: admin.id },
    { merge: true }
  );
  await logAuditEntry({
    adminId: admin.id,
    adminName: admin.name,
    action: 'invoice_config_updated',
    collection: Collections.INVOICE_CONFIG,
    itemId: 'default',
    itemDescription: 'Invoice Configuration',
    changes: [
      { field: 'generationDay', oldValue: null, newValue: config.generationDay },
      { field: 'dueDay', oldValue: null, newValue: config.dueDay },
      { field: 'membershipType', oldValue: null, newValue: config.membershipType },
    ],
  });
}

export async function getInvoicesByFilter(filter: string): Promise<Invoice[]> {
  const { current, last } = currentAndLastPeriod();

  switch (filter) {
    case 'generatedThisMonth': {
      const snap = await getDocs(query(collection(db, Collections.INVOICES), where('period', '==', current)));
      return snap.docs.map(toInvoice);
    }
    case 'generatedLastMonth': {
      const snap = await getDocs(query(collection(db, Collections.INVOICES), where('period', '==', last)));
      return snap.docs.map(toInvoice);
    }
    case 'pending': {
      const snap = await getDocs(query(collection(db, Collections.INVOICES), where('status', '==', 'pending')));
      return snap.docs.map(toInvoice);
    }
    case 'overdue': {
      const snap = await getDocs(query(collection(db, Collections.INVOICES), where('status', '==', 'overdue')));
      return snap.docs.map(toInvoice);
    }
    case 'paidThisMonth': {
      const snap = await getDocs(query(collection(db, Collections.INVOICES), where('period', '==', current)));
      return snap.docs.map(toInvoice).filter((i) => i.status === 'paid');
    }
    case 'paidLastMonth': {
      const snap = await getDocs(query(collection(db, Collections.INVOICES), where('period', '==', last)));
      return snap.docs.map(toInvoice).filter((i) => i.status === 'paid');
    }
    default:
      return [];
  }
}

export async function generateInvoicesOnDemand(memberId?: string, period?: string): Promise<{ created: number }> {
  const fn = httpsCallable(functions, 'generateInvoicesOnDemand');
  const result = await fn({ memberId: memberId ?? null, period: period ?? null });
  return result.data as { created: number };
}

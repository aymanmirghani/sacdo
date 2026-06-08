import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, Collections } from '../firebase';
import { logAuditEntry } from './audit';
import type { User, RegistrationRequest, MembershipFee, PaymentType, Payment, Event } from '../types';

// ─── Registration ────────────────────────────────────────────────────────────

export async function submitRegistrationRequest(data: {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}): Promise<void> {
  await addDoc(collection(db, Collections.REGISTRATION_REQUESTS), {
    ...data,
    status: 'pending',
    submittedAt: serverTimestamp(),
  });
}

export async function getPendingRequests(): Promise<RegistrationRequest[]> {
  const q = query(
    collection(db, Collections.REGISTRATION_REQUESTS),
    where('status', '==', 'pending'),
    orderBy('submittedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    firstName: d.data().firstName,
    lastName: d.data().lastName,
    phone: d.data().phone,
    email: d.data().email,
    status: d.data().status,
    rejectionReason: d.data().rejectionReason,
    submittedAt: d.data().submittedAt?.toDate(),
    reviewedAt: d.data().reviewedAt?.toDate(),
    reviewedBy: d.data().reviewedBy,
  }));
}

export async function approveRegistration(requestId: string, adminId: string): Promise<void> {
  const fn = httpsCallable(functions, 'approveRegistration');
  await fn({ requestId, adminId });
}

export async function rejectRegistration(requestId: string, adminId: string, reason: string): Promise<void> {
  const fn = httpsCallable(functions, 'rejectRegistration');
  await fn({ requestId, adminId, reason });
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function getAllMembers(): Promise<User[]> {
  const q = query(
    collection(db, Collections.USERS),
    where('role', '==', 'Member'),
    orderBy('lastName')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    firstName: d.data().firstName,
    lastName: d.data().lastName,
    phone: d.data().phone,
    email: d.data().email,
    role: d.data().role,
    isAdmin: d.data().IsAdmin ?? false,
    status: d.data().status,
    createdAt: d.data().createdAt?.toDate(),
  }));
}

export async function updateMember(
  memberId: string,
  data: { firstName: string; lastName: string; phone: string; email: string; isAdmin: boolean; status: 'active' | 'inactive' }
): Promise<void> {
  await updateDoc(doc(db, Collections.USERS, memberId), {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    email: data.email,
    IsAdmin: data.isAdmin,
    status: data.status,
  });
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function getMemberPayments(memberId: string): Promise<Payment[]> {
  const q = query(
    collection(db, Collections.PAYMENTS),
    where('memberId', '==', memberId),
    orderBy('paymentDate', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    memberId: d.data().memberId,
    amount: d.data().amount,
    paymentDate: d.data().paymentDate?.toDate(),
    recordedBy: d.data().recordedBy,
    membershipType: d.data().membershipType,
    paymentType: d.data().paymentType,
    notes: d.data().notes,
  }));
}

// ─── Payment Types ────────────────────────────────────────────────────────────

export async function getPaymentTypes(): Promise<PaymentType[]> {
  const q = query(collection(db, Collections.PAYMENT_TYPES), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, name: d.data().name as string }));
}

export async function upsertPaymentType(
  pt: { id?: string; name: string },
  admin: { id: string; name: string }
): Promise<void> {
  const { id, name } = pt;
  if (id) {
    const old = (await getDocs(query(collection(db, Collections.PAYMENT_TYPES), where('__name__', '==', id)))).docs[0]?.data()?.name ?? null;
    await updateDoc(doc(db, Collections.PAYMENT_TYPES, id), { name });
    if (old !== name) {
      await logAuditEntry({ adminId: admin.id, adminName: admin.name, action: 'payment_type_updated', collection: Collections.PAYMENT_TYPES, itemId: id, itemDescription: name, changes: [{ field: 'name', oldValue: old, newValue: name }] });
    }
  } else {
    const ref = await addDoc(collection(db, Collections.PAYMENT_TYPES), { name });
    await logAuditEntry({ adminId: admin.id, adminName: admin.name, action: 'payment_type_created', collection: Collections.PAYMENT_TYPES, itemId: ref.id, itemDescription: name, changes: [{ field: 'name', oldValue: null, newValue: name }] });
  }
}

export async function deletePaymentType(id: string, admin: { id: string; name: string }): Promise<void> {
  const snap = await getDocs(query(collection(db, Collections.PAYMENT_TYPES), where('__name__', '==', id)));
  const oldName = snap.docs[0]?.data()?.name ?? id;
  await deleteDoc(doc(db, Collections.PAYMENT_TYPES, id));
  await logAuditEntry({ adminId: admin.id, adminName: admin.name, action: 'payment_type_deleted', collection: Collections.PAYMENT_TYPES, itemId: id, itemDescription: oldName, changes: [{ field: 'name', oldValue: oldName, newValue: null }] });
}

// ─── Membership Fees ──────────────────────────────────────────────────────────

export async function getMembershipFees(): Promise<MembershipFee[]> {
  const snap = await getDocs(collection(db, Collections.MEMBERSHIP_FEES));
  return snap.docs.map((d) => ({
    id: d.id,
    membershipType: d.data().membershipType,
    amount: d.data().amount,
    description: d.data().description,
    updatedAt: d.data().updatedAt?.toDate(),
  }));
}

export async function upsertMembershipFee(
  fee: Omit<MembershipFee, 'id' | 'updatedAt'> & { id?: string },
  admin: { id: string; name: string }
): Promise<void> {
  const { id, ...fields } = fee;
  const payload = { ...fields, updatedAt: serverTimestamp() };
  if (id) {
    await setDoc(doc(db, Collections.MEMBERSHIP_FEES, id), payload, { merge: true });
    await logAuditEntry({ adminId: admin.id, adminName: admin.name, action: 'fee_updated', collection: Collections.MEMBERSHIP_FEES, itemId: id, itemDescription: fields.membershipType, changes: [{ field: 'amount', oldValue: null, newValue: fields.amount }] });
  } else {
    const ref = await addDoc(collection(db, Collections.MEMBERSHIP_FEES), payload);
    await logAuditEntry({ adminId: admin.id, adminName: admin.name, action: 'fee_created', collection: Collections.MEMBERSHIP_FEES, itemId: ref.id, itemDescription: fields.membershipType, changes: [{ field: 'amount', oldValue: null, newValue: fields.amount }] });
  }
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEvents(): Promise<Event[]> {
  const q = query(collection(db, Collections.EVENTS), orderBy('startDate', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    title: d.data().title,
    description: d.data().description,
    startDate: d.data().startDate?.toDate(),
    endDate: d.data().endDate?.toDate(),
    location: d.data().location,
    createdBy: d.data().createdBy,
  }));
}

export async function upsertEvent(event: Partial<Event> & { id?: string }): Promise<void> {
  const { id, ...fields } = event;
  const payload = {
    ...fields,
    startDate: fields.startDate ? Timestamp.fromDate(fields.startDate) : undefined,
    endDate: fields.endDate ? Timestamp.fromDate(fields.endDate) : undefined,
  };
  if (id) {
    await setDoc(doc(db, Collections.EVENTS, id), payload, { merge: true });
  } else {
    await addDoc(collection(db, Collections.EVENTS), payload);
  }
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, Collections.EVENTS, eventId));
}

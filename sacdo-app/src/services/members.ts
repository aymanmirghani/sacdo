import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { Collections } from './firebase';
import { User, RegistrationRequest, MembershipFee, PaymentType, Payment, Event } from '../types';
import { logAuditEntry } from './audit';

function toUser(doc: any): User {
  const d = doc.data();
  return {
    id: doc.id,
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone,
    email: d.email,
    role: d.role,
    isAdmin: d.IsAdmin ?? false,
    status: d.status,
    createdAt: d.createdAt?.toDate(),
  };
}

function toRequest(doc: any): RegistrationRequest {
  const d = doc.data();
  return {
    id: doc.id,
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone,
    email: d.email,
    status: d.status,
    rejectionReason: d.rejectionReason,
    submittedAt: d.submittedAt?.toDate(),
    reviewedAt: d.reviewedAt?.toDate(),
    reviewedBy: d.reviewedBy,
  };
}

// Registration
export async function submitRegistrationRequest(data: {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}) {
  await firestore().collection(Collections.REGISTRATION_REQUESTS).add({
    ...data,
    status: 'pending',
    submittedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function getPendingRequests(): Promise<RegistrationRequest[]> {
  const snap = await firestore()
    .collection(Collections.REGISTRATION_REQUESTS)
    .where('status', '==', 'pending')
    .orderBy('submittedAt', 'desc')
    .get();
  return snap.docs.map(toRequest);
}

export async function approveRegistration(requestId: string, adminId: string) {
  const fn = functions().httpsCallable('approveRegistration');
  await fn({ requestId, adminId });
}

export async function rejectRegistration(requestId: string, adminId: string, reason: string) {
  const fn = functions().httpsCallable('rejectRegistration');
  await fn({ requestId, adminId, reason });
}

// Members
export async function getAllMembers(): Promise<User[]> {
  const snap = await firestore()
    .collection(Collections.USERS)
    .where('role', '==', 'Member')
    .orderBy('lastName')
    .get();
  return snap.docs.map(toUser);
}

export async function setMemberStatus(memberId: string, status: 'active' | 'inactive') {
  await firestore().collection(Collections.USERS).doc(memberId).update({ status });
}

export async function updateMember(memberId: string, data: {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  isAdmin: boolean;
  status: 'active' | 'inactive';
}) {
  await firestore().collection(Collections.USERS).doc(memberId).update({
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    email: data.email,
    IsAdmin: data.isAdmin,
    status: data.status,
  });
}

// Payments
export async function getMemberPayments(memberId: string): Promise<Payment[]> {
  const snap = await firestore()
    .collection(Collections.PAYMENTS)
    .where('memberId', '==', memberId)
    .orderBy('paymentDate', 'desc')
    .get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      memberId: d.memberId,
      amount: d.amount,
      paymentDate: d.paymentDate?.toDate(),
      recordedBy: d.recordedBy,
      membershipType: d.membershipType,
      paymentType: d.paymentType,
      notes: d.notes,
    };
  });
}

export async function recordPayment(data: {
  memberId: string;
  amount: number;
  paymentDate: Date;
  recordedBy: string;
  membershipType: string;
  paymentType?: string;
  notes?: string;
}) {
  await firestore().collection(Collections.PAYMENTS).add({
    ...data,
    paymentDate: firestore.Timestamp.fromDate(data.paymentDate),
  });
}

// Payment Types
export async function getPaymentTypes(): Promise<PaymentType[]> {
  const snap = await firestore().collection(Collections.PAYMENT_TYPES).orderBy('name').get();
  return snap.docs.map((doc) => ({ id: doc.id, name: doc.data().name as string }));
}

export async function upsertPaymentType(
  pt: { id?: string; name: string },
  admin: { id: string; name: string }
) {
  const { id, ...fields } = pt;
  if (id) {
    const oldDoc = await firestore().collection(Collections.PAYMENT_TYPES).doc(id).get();
    const oldName = oldDoc.data()?.name ?? null;
    await firestore().collection(Collections.PAYMENT_TYPES).doc(id).set(fields, { merge: true });
    if (oldName !== fields.name) {
      await logAuditEntry({
        adminId: admin.id,
        adminName: admin.name,
        action: 'payment_type_updated',
        collection: Collections.PAYMENT_TYPES,
        itemId: id,
        itemDescription: fields.name,
        changes: [{ field: 'name', oldValue: oldName, newValue: fields.name }],
      });
    }
  } else {
    const ref = await firestore().collection(Collections.PAYMENT_TYPES).add(fields);
    await logAuditEntry({
      adminId: admin.id,
      adminName: admin.name,
      action: 'payment_type_created',
      collection: Collections.PAYMENT_TYPES,
      itemId: ref.id,
      itemDescription: fields.name,
      changes: [{ field: 'name', oldValue: null, newValue: fields.name }],
    });
  }
}

export async function deletePaymentType(id: string, admin: { id: string; name: string }) {
  const oldDoc = await firestore().collection(Collections.PAYMENT_TYPES).doc(id).get();
  const oldName = oldDoc.data()?.name ?? id;
  await firestore().collection(Collections.PAYMENT_TYPES).doc(id).delete();
  await logAuditEntry({
    adminId: admin.id,
    adminName: admin.name,
    action: 'payment_type_deleted',
    collection: Collections.PAYMENT_TYPES,
    itemId: id,
    itemDescription: oldName,
    changes: [{ field: 'name', oldValue: oldName, newValue: null }],
  });
}

// Membership Fees
export async function getMembershipFees(): Promise<MembershipFee[]> {
  const snap = await firestore().collection(Collections.MEMBERSHIP_FEES).get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      membershipType: d.membershipType,
      amount: d.amount,
      description: d.description,
      updatedAt: d.updatedAt?.toDate(),
    };
  });
}

export async function upsertMembershipFee(
  fee: Omit<MembershipFee, 'id' | 'updatedAt'> & { id?: string },
  admin: { id: string; name: string }
) {
  const { id, ...fields } = fee;
  const payload = { ...fields, updatedAt: firestore.FieldValue.serverTimestamp() };
  if (id) {
    const oldDoc = await firestore().collection(Collections.MEMBERSHIP_FEES).doc(id).get();
    const old = oldDoc.data();
    await firestore().collection(Collections.MEMBERSHIP_FEES).doc(id).set(payload, { merge: true });
    const trackFields: Array<keyof typeof fields> = ['membershipType', 'amount', 'description'];
    const changes = trackFields
      .filter((f) => !old || old[f] !== fields[f])
      .map((f) => ({ field: f, oldValue: old ? (old[f] ?? null) : null, newValue: fields[f] as string | number }));
    if (changes.length > 0) {
      await logAuditEntry({
        adminId: admin.id,
        adminName: admin.name,
        action: 'fee_updated',
        collection: Collections.MEMBERSHIP_FEES,
        itemId: id,
        itemDescription: fields.membershipType,
        changes,
      });
    }
  } else {
    const ref = await firestore().collection(Collections.MEMBERSHIP_FEES).add(payload);
    await logAuditEntry({
      adminId: admin.id,
      adminName: admin.name,
      action: 'fee_created',
      collection: Collections.MEMBERSHIP_FEES,
      itemId: ref.id,
      itemDescription: fields.membershipType,
      changes: [
        { field: 'membershipType', oldValue: null, newValue: fields.membershipType },
        { field: 'amount', oldValue: null, newValue: fields.amount },
        { field: 'description', oldValue: null, newValue: fields.description },
      ],
    });
  }
}

// Events
export async function getEvents(): Promise<Event[]> {
  const snap = await firestore()
    .collection(Collections.EVENTS)
    .orderBy('startDate', 'asc')
    .get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      title: d.title,
      description: d.description,
      startDate: d.startDate?.toDate(),
      endDate: d.endDate?.toDate(),
      location: d.location,
      createdBy: d.createdBy,
    };
  });
}

export async function upsertEvent(event: Partial<Event> & { id?: string }) {
  const { id, ...fields } = event;
  const payload = {
    ...fields,
    startDate: fields.startDate ? firestore.Timestamp.fromDate(fields.startDate) : undefined,
    endDate: fields.endDate ? firestore.Timestamp.fromDate(fields.endDate) : undefined,
  };
  if (id) {
    await firestore().collection(Collections.EVENTS).doc(id).set(payload, { merge: true });
  } else {
    await firestore().collection(Collections.EVENTS).add(payload);
  }
}

export async function deleteEvent(eventId: string) {
  await firestore().collection(Collections.EVENTS).doc(eventId).delete();
}

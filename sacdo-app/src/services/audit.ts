import firestore from '@react-native-firebase/firestore';
import { Collections } from './firebase';
import { AuditLogEntry } from '../types';

export async function logAuditEntry(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): Promise<void> {
  await firestore().collection(Collections.AUDIT_LOG).add({
    ...entry,
    timestamp: firestore.FieldValue.serverTimestamp(),
  });
}

export async function getAuditLog(limitCount = 100): Promise<AuditLogEntry[]> {
  const snap = await firestore()
    .collection(Collections.AUDIT_LOG)
    .orderBy('timestamp', 'desc')
    .limit(limitCount)
    .get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      adminId: d.adminId,
      adminName: d.adminName,
      action: d.action,
      collection: d.collection,
      itemId: d.itemId,
      itemDescription: d.itemDescription,
      changes: d.changes ?? [],
      timestamp: d.timestamp?.toDate() ?? new Date(),
    };
  });
}

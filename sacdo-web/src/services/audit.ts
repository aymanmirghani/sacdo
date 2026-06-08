import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db, Collections } from '../firebase';
import type { AuditLogEntry } from '../types';

export async function logAuditEntry(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
  await addDoc(collection(db, Collections.AUDIT_LOG), {
    ...entry,
    timestamp: serverTimestamp(),
  });
}

export async function getAuditLog(limitCount = 200): Promise<AuditLogEntry[]> {
  const q = query(
    collection(db, Collections.AUDIT_LOG),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
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

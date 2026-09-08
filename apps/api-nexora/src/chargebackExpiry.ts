import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from './firebaseAdmin.js';

const ACTIVE_STATUSES = ['OPENED', 'UNDER_REVIEW'];

export async function expireOverdueChargebackCases(limit = 100): Promise<number> {
  const db = getDb();
  const snapshot = await db.collection('chargebackCases')
    .where('status', 'in', ACTIVE_STATUSES)
    .limit(Math.min(Math.max(Math.floor(limit), 1), 100))
    .get();

  const now = Date.now();
  let expired = 0;
  await db.runTransaction(async tx => {
    for (const doc of snapshot.docs) {
      const data = doc.data() || {};
      const deadline = Date.parse(String(data.responseDeadline || ''));
      if (!Number.isFinite(deadline) || deadline > now) continue;
      const currentStatus = String(data.status || '').toUpperCase();
      if (!ACTIVE_STATUSES.includes(currentStatus)) continue;
      tx.update(doc.ref, {
        status: 'EXPIRED',
        resolvedAt: new Date().toISOString(),
        resolutionReason: 'MERCADO_PAGO_RESPONSE_DEADLINE_EXPIRED',
        updatedAt: FieldValue.serverTimestamp(),
      });
      expired += 1;
    }
  });
  return expired;
}

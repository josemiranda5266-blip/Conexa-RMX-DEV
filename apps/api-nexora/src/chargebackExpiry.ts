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
  const expiredAt = new Date(now).toISOString();
  let expired = 0;
  await db.runTransaction(async tx => {
    for (const doc of snapshot.docs) {
      const current = await tx.get(doc.ref);
      if (!current.exists) continue;
      const data = current.data() || {};
      const status = String(data.status || '').toUpperCase();
      const deadline = Date.parse(String(data.responseDeadline || ''));
      if (!ACTIVE_STATUSES.includes(status) || !Number.isFinite(deadline) || deadline > now) continue;
      tx.update(doc.ref, {
        status: 'EXPIRED',
        resolvedAt: expiredAt,
        resolutionReason: 'MERCADO_PAGO_RESPONSE_DEADLINE_EXPIRED',
        updatedAt: FieldValue.serverTimestamp(),
      });
      expired += 1;
    }
  });
  return expired;
}

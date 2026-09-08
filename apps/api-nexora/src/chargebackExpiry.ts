import { getDb } from './firebaseAdmin.js';

const COLLECTION = 'chargebackCases';
const BATCH_LIMIT = 100;

/**
 * Marks unanswered chargeback cases as EXPIRED after their provider response deadline.
 * Financial loss is not recognized here; final outcome remains a provider decision.
 */
export async function expireOverdueChargebackCases(now = new Date()): Promise<number> {
  const db = getDb();
  const nowIso = now.toISOString();
  const snapshot = await db
    .collection(COLLECTION)
    .where('responseDeadline', '<=', nowIso)
    .limit(BATCH_LIMIT)
    .get();

  let expired = 0;
  for (const document of snapshot.docs) {
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(document.ref);
      if (!current.exists) return;

      const data = current.data() || {};
      const status = String(data.status || '');
      const deadline = String(data.responseDeadline || '');
      const evidenceSubmittedAt = String(data.evidenceSubmittedAt || '').trim();

      if (!['OPENED', 'UNDER_REVIEW'].includes(status)) return;
      if (!deadline || deadline > nowIso) return;
      if (evidenceSubmittedAt) return;

      transaction.update(document.ref, {
        status: 'EXPIRED',
        documentationStatus: 'NOT_SENT',
        expiredAt: nowIso,
        updatedAt: nowIso,
        lastExpiryCheckAt: nowIso,
      });
      expired += 1;
    });
  }

  return expired;
}

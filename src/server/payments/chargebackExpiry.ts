import { getAdminDb } from '../firebaseAdmin.js';

const COLLECTION = 'chargebackCases';
const INTERVAL_MS = 15 * 60 * 1000;
const BATCH_LIMIT = 100;

/**
 * Marks unanswered chargeback cases as EXPIRED after their provider response deadline.
 * It deliberately does not mark the payment as CHARGEBACK: financial loss is only
 * recognized when Mercado Pago confirms the final outcome (coverage_applied=false).
 */
export async function expireOverdueChargebackCases(now = new Date()): Promise<number> {
  const db = await getAdminDb();
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
      const evidence = Array.isArray(data.evidence) ? data.evidence : [];

      if (!['OPENED', 'UNDER_REVIEW'].includes(status)) return;
      if (!deadline || deadline > nowIso) return;
      if (evidence.length > 0) return;

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

let workerStarted = false;

/** Start a process-local safety worker. Firestore transactions make duplicate workers idempotent. */
export function startChargebackExpiryWorker(): void {
  if (workerStarted || process.env.DISABLE_CHARGEBACK_EXPIRY_WORKER === 'true') return;
  workerStarted = true;

  const run = async () => {
    try {
      const expired = await expireOverdueChargebackCases();
      if (expired > 0) console.info(`[CHARGEBACK EXPIRY] ${expired} case(s) marked EXPIRED`);
    } catch (error: any) {
      console.error('[CHARGEBACK EXPIRY] Worker failed:', error?.message || error);
    }
  };

  void run();
  const timer = setInterval(() => void run(), INTERVAL_MS);
  timer.unref?.();
}

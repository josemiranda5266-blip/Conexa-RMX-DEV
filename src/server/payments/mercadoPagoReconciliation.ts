import { getAdminDb } from '../firebaseAdmin.js';
import { MercadoPagoOAuthConnection } from './mercadoPagoOAuthTokenStore.js';
import { fetchMercadoPagoPaymentWithConnection } from './mercadoPagoPayment.js';

const TRANSACTION_COLLECTION = 'transactions';

type ReconciledProviderStatus = 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back' | 'chargedback' | 'unknown';

export type PaymentReconciliationResult =
  | { status: 'PAID'; transactionId: string }
  | { status: 'ALREADY_PAID'; transactionId: string }
  | { status: 'UPDATED'; transactionId: string; paymentStatus: ReconciledProviderStatus }
  | { status: 'IGNORED'; reason: string };

function normalizeAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return NaN;
  return Math.round(amount * 100) / 100;
}

function providerStatus(payment: any): ReconciledProviderStatus {
  const status = String(payment?.status || '').trim().toLowerCase();
  const allowed: ReconciledProviderStatus[] = ['pending', 'approved', 'authorized', 'in_process', 'in_mediation', 'rejected', 'cancelled', 'refunded', 'charged_back', 'chargedback'];
  return allowed.includes(status as ReconciledProviderStatus) ? status as ReconciledProviderStatus : 'unknown';
}

function paymentReference(payment: any): string | null {
  const reference = payment?.external_reference;
  return reference == null ? null : String(reference).trim() || null;
}

function paymentMerchantId(payment: any): string | null {
  const id = payment?.collector_id ?? payment?.collector?.id ?? payment?.user_id;
  return id == null ? null : String(id);
}

export async function reconcileMercadoPagoPayment(
  paymentId: string,
  connection: MercadoPagoOAuthConnection,
): Promise<PaymentReconciliationResult> {
  if (!paymentId?.trim()) return { status: 'IGNORED', reason: 'PAYMENT_ID_REQUIRED' };

  const payment = await fetchMercadoPagoPaymentWithConnection(connection, paymentId);
  const paymentStatus = providerStatus(payment);
  const transactionId = paymentReference(payment);
  if (!transactionId) return { status: 'IGNORED', reason: 'EXTERNAL_REFERENCE_MISSING' };

  const paymentAmount = normalizeAmount(payment.transaction_amount);
  if (!Number.isFinite(paymentAmount)) return { status: 'IGNORED', reason: 'PAYMENT_AMOUNT_INVALID' };

  const db = getAdminDb();
  const transactionRef = db.collection(TRANSACTION_COLLECTION).doc(transactionId);
  const transactionSnapshot = await transactionRef.get();
  if (!transactionSnapshot.exists) return { status: 'IGNORED', reason: 'TRANSACTION_NOT_FOUND' };

  const transaction = transactionSnapshot.data() || {};
  if (!transaction.professionalId || String(transaction.professionalId) !== String(connection.merchantId)) {
    return { status: 'IGNORED', reason: 'TRANSACTION_MERCHANT_MISMATCH' };
  }

  const expectedAmount = normalizeAmount(transaction.amountArs);
  if (!Number.isFinite(expectedAmount) || expectedAmount !== paymentAmount) {
    return { status: 'IGNORED', reason: 'PAYMENT_AMOUNT_MISMATCH' };
  }

  if (transaction.mercadoPagoPaymentId && String(transaction.mercadoPagoPaymentId) !== String(paymentId)) {
    return { status: 'IGNORED', reason: 'PAYMENT_ID_MISMATCH' };
  }

  const collectorId = paymentMerchantId(payment);
  if (collectorId && connection.externalUserId && collectorId !== String(connection.externalUserId)) {
    return { status: 'IGNORED', reason: 'PAYMENT_MERCHANT_MISMATCH' };
  }

  return db.runTransaction(async (tx: any) => {
    const fresh = await tx.get(transactionRef);
    if (!fresh.exists) return { status: 'IGNORED', reason: 'TRANSACTION_NOT_FOUND' };
    const current = fresh.data() || {};
    const currentStatus = String(current.status || '').toUpperCase();
    const now = new Date().toISOString();

    if (!current.professionalId || String(current.professionalId) !== String(connection.merchantId)) {
      return { status: 'IGNORED', reason: 'TRANSACTION_MERCHANT_CHANGED' };
    }

    if (current.mercadoPagoPaymentId && String(current.mercadoPagoPaymentId) !== String(paymentId)) {
      return { status: 'IGNORED', reason: 'PAYMENT_ID_CHANGED' };
    }

    const update: Record<string, unknown> = {
      paymentStatus,
      mercadoPagoPaymentId: String(paymentId),
      paymentUpdatedAt: now,
    };

    if (paymentStatus === 'approved') {
      if (['PAYMENT_PENDING', 'CREATED'].includes(currentStatus)) {
        update.status = 'PAID';
        update.settlementStatus = current.settlementStatus || 'PENDING';
        update.paidAt = current.paidAt || now;
        tx.update(transactionRef, update);
        return { status: 'PAID', transactionId };
      }

      if (currentStatus === 'PAID' || String(current.paymentStatus || '').toLowerCase() === 'approved') {
        if (currentStatus !== 'PAID') update.status = 'PAID';
        if (!current.paidAt) update.paidAt = now;
        tx.update(transactionRef, update);
        return { status: 'ALREADY_PAID', transactionId };
      }

      // An approved provider event arriving after service progression must not
      // roll the commercial state backward. Persist provider truth only.
      tx.update(transactionRef, update);
      return { status: 'UPDATED', transactionId, paymentStatus };
    }

    if (paymentStatus === 'refunded' || paymentStatus === 'charged_back' || paymentStatus === 'chargedback') {
      if (paymentStatus === 'refunded') update.refundedAt = current.refundedAt || now;
      else update.chargebackAt = current.chargebackAt || now;
      tx.update(transactionRef, update);
      return { status: 'UPDATED', transactionId, paymentStatus };
    }

    if (paymentStatus === 'cancelled' && ['PAYMENT_PENDING', 'CREATED'].includes(currentStatus)) {
      update.status = 'CANCELLED';
      update.cancelledAt = current.cancelledAt || now;
    }

    // Rejected, pending, authorized, in_process, in_mediation and late
    // cancellation events update provider truth without degrading an already
    // progressed commercial transaction.
    tx.update(transactionRef, update);
    return { status: 'UPDATED', transactionId, paymentStatus };
  });
}

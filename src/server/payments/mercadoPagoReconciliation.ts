import { getAdminDb } from '../firebaseAdmin.js';
import { MercadoPagoOAuthConnection, decryptOAuthToken } from './mercadoPagoOAuthTokenStore.js';
import { fetchMercadoPagoPaymentWithConnection } from './mercadoPagoPayment.js';

const TRANSACTION_COLLECTION = 'transactions';

export type PaymentReconciliationResult =
  | { status: 'PAID'; transactionId: string }
  | { status: 'ALREADY_PAID'; transactionId: string }
  | { status: 'IGNORED'; reason: string };

function normalizeAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return NaN;
  return Math.round(amount * 100) / 100;
}

function paymentIsApproved(payment: any): boolean {
  return String(payment?.status || '').toLowerCase() === 'approved';
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
  if (!paymentIsApproved(payment)) return { status: 'IGNORED', reason: 'PAYMENT_NOT_APPROVED' };

  const transactionId = paymentReference(payment);
  if (!transactionId) return { status: 'IGNORED', reason: 'EXTERNAL_REFERENCE_MISSING' };

  const paymentAmount = normalizeAmount(payment.transaction_amount);
  if (!Number.isFinite(paymentAmount)) return { status: 'IGNORED', reason: 'PAYMENT_AMOUNT_INVALID' };

  const db = getAdminDb();
  const transactionRef = db.collection(TRANSACTION_COLLECTION).doc(transactionId);
  const transactionSnapshot = await transactionRef.get();
  if (!transactionSnapshot.exists) return { status: 'IGNORED', reason: 'TRANSACTION_NOT_FOUND' };

  const transaction = transactionSnapshot.data() || {};
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

    if (String(current.status || '').toUpperCase() === 'PAID') {
      if (current.mercadoPagoPaymentId && String(current.mercadoPagoPaymentId) !== String(paymentId)) {
        return { status: 'IGNORED', reason: 'PAID_WITH_DIFFERENT_PAYMENT' };
      }
      return { status: 'ALREADY_PAID', transactionId };
    }

    if (String(current.status || '').toUpperCase() !== 'PAYMENT_PENDING') {
      return { status: 'IGNORED', reason: 'TRANSACTION_NOT_PAYMENT_PENDING' };
    }

    if (normalizeAmount(current.amountArs) !== paymentAmount) {
      return { status: 'IGNORED', reason: 'PAYMENT_AMOUNT_CHANGED' };
    }

    tx.update(transactionRef, {
      status: 'PAID',
      mercadoPagoPaymentId: String(paymentId),
      paidAt: new Date().toISOString(),
      paymentUpdatedAt: new Date().toISOString(),
    });

    return { status: 'PAID', transactionId };
  });
}

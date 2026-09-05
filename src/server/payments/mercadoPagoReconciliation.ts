import { getAdminDb } from '../firebaseAdmin.js';
import { MercadoPagoOAuthConnection } from './mercadoPagoOAuthTokenStore.js';
import { fetchMercadoPagoPaymentWithConnection } from './mercadoPagoPayment.js';

const TRANSACTION_COLLECTION = 'transactions';
const NEXORA_PAYMENT_COLLECTION = 'paymentTransactions';
type ReconciledProviderStatus = 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back' | 'chargedback' | 'unknown';
export type PaymentReconciliationResult = { status: 'PAID'; transactionId: string } | { status: 'ALREADY_PAID'; transactionId: string } | { status: 'UPDATED'; transactionId: string; paymentStatus: ReconciledProviderStatus } | { status: 'IGNORED'; reason: string };
function normalizeAmount(value: unknown): number { const amount = Number(value); return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : NaN; }
function providerStatus(payment: any): ReconciledProviderStatus { const status = String(payment?.status || '').trim().toLowerCase(); const allowed: ReconciledProviderStatus[] = ['pending', 'approved', 'authorized', 'in_process', 'in_mediation', 'rejected', 'cancelled', 'refunded', 'charged_back', 'chargedback']; return allowed.includes(status as ReconciledProviderStatus) ? status as ReconciledProviderStatus : 'unknown'; }
function paymentReference(payment: any): string | null { const reference = payment?.external_reference; return reference == null ? null : String(reference).trim() || null; }
function paymentMerchantId(payment: any): string | null { const id = payment?.collector_id ?? payment?.collector?.id ?? payment?.user_id; return id == null ? null : String(id); }

async function resolveFinancialRecord(transactionId: string) {
  const db = getAdminDb();
  const [conexa, nexora] = await Promise.all([
    db.collection(TRANSACTION_COLLECTION).doc(transactionId).get(),
    db.collection(NEXORA_PAYMENT_COLLECTION).doc(transactionId).get(),
  ]);
  if (conexa.exists) return { ref: db.collection(TRANSACTION_COLLECTION).doc(transactionId), data: conexa.data() || {}, kind: 'CONEXA' as const };
  if (nexora.exists) return { ref: db.collection(NEXORA_PAYMENT_COLLECTION).doc(transactionId), data: nexora.data() || {}, kind: 'NEXORA' as const };
  return null;
}

export async function reconcileMercadoPagoPayment(paymentId: string, connection: MercadoPagoOAuthConnection): Promise<PaymentReconciliationResult> {
  if (!paymentId?.trim()) return { status: 'IGNORED', reason: 'PAYMENT_ID_REQUIRED' };
  const payment = await fetchMercadoPagoPaymentWithConnection(connection, paymentId);
  const paymentStatus = providerStatus(payment);
  const transactionId = paymentReference(payment);
  if (!transactionId) return { status: 'IGNORED', reason: 'EXTERNAL_REFERENCE_MISSING' };
  const paymentAmount = normalizeAmount(payment.transaction_amount);
  if (!Number.isFinite(paymentAmount)) return { status: 'IGNORED', reason: 'PAYMENT_AMOUNT_INVALID' };

  const resolved = await resolveFinancialRecord(transactionId);
  if (!resolved) return { status: 'IGNORED', reason: 'TRANSACTION_NOT_FOUND' };
  const expectedMerchant = resolved.kind === 'NEXORA' ? resolved.data.merchantId : resolved.data.professionalId;
  const expectedAmount = normalizeAmount(resolved.data.amountArs);
  if (!expectedMerchant || String(expectedMerchant) !== String(connection.merchantId)) return { status: 'IGNORED', reason: 'TRANSACTION_MERCHANT_MISMATCH' };
  if (!Number.isFinite(expectedAmount) || expectedAmount !== paymentAmount) return { status: 'IGNORED', reason: 'PAYMENT_AMOUNT_MISMATCH' };
  if (resolved.data.mercadoPagoPaymentId && String(resolved.data.mercadoPagoPaymentId) !== String(paymentId)) return { status: 'IGNORED', reason: 'PAYMENT_ID_MISMATCH' };
  if (resolved.data.providerPaymentId && String(resolved.data.providerPaymentId) !== String(paymentId)) return { status: 'IGNORED', reason: 'PAYMENT_ID_MISMATCH' };
  const collectorId = paymentMerchantId(payment);
  if (collectorId && connection.externalUserId && collectorId !== String(connection.externalUserId)) return { status: 'IGNORED', reason: 'PAYMENT_MERCHANT_MISMATCH' };

  const db = getAdminDb();
  return db.runTransaction(async tx => {
    const fresh = await tx.get(resolved.ref);
    if (!fresh.exists) return { status: 'IGNORED', reason: 'TRANSACTION_NOT_FOUND' };
    const current = fresh.data() || {};
    const currentStatus = String(current.status || '').toUpperCase();
    const now = new Date().toISOString();
    const currentMerchant = resolved.kind === 'NEXORA' ? current.merchantId : current.professionalId;
    if (!currentMerchant || String(currentMerchant) !== String(connection.merchantId)) return { status: 'IGNORED', reason: 'TRANSACTION_MERCHANT_CHANGED' };
    if ((current.mercadoPagoPaymentId && String(current.mercadoPagoPaymentId) !== String(paymentId)) || (current.providerPaymentId && String(current.providerPaymentId) !== String(paymentId))) return { status: 'IGNORED', reason: 'PAYMENT_ID_CHANGED' };

    const update: Record<string, unknown> = { paymentStatus, paymentUpdatedAt: now, ...(resolved.kind === 'NEXORA' ? { providerPaymentId: String(paymentId) } : { mercadoPagoPaymentId: String(paymentId) }) };
    if (paymentStatus === 'approved') {
      if (resolved.kind === 'NEXORA') {
        if (currentStatus === 'PAYMENT_PENDING') {
          update.status = 'PAID'; update.paidAt = current.paidAt || now;
          tx.update(resolved.ref, update);
          return { status: 'PAID', transactionId };
        }
        if (currentStatus === 'PAID' || String(current.paymentStatus || '').toLowerCase() === 'approved') {
          if (currentStatus !== 'PAID') update.status = 'PAID';
          if (!current.paidAt) update.paidAt = now;
          tx.update(resolved.ref, update);
          return { status: 'ALREADY_PAID', transactionId };
        }
        tx.update(resolved.ref, update);
        return { status: 'UPDATED', transactionId, paymentStatus };
      }
      if (['PAYMENT_PENDING', 'CREATED'].includes(currentStatus)) {
        update.status = 'PAID'; update.settlementStatus = current.settlementStatus || 'PENDING'; update.paidAt = current.paidAt || now;
        tx.update(resolved.ref, update); return { status: 'PAID', transactionId };
      }
      if (currentStatus === 'PAID' || String(current.paymentStatus || '').toLowerCase() === 'approved') {
        if (currentStatus !== 'PAID') update.status = 'PAID';
        if (!current.paidAt) update.paidAt = now;
        tx.update(resolved.ref, update); return { status: 'ALREADY_PAID', transactionId };
      }
      tx.update(resolved.ref, update); return { status: 'UPDATED', transactionId, paymentStatus };
    }

    if (paymentStatus === 'refunded' || paymentStatus === 'charged_back' || paymentStatus === 'chargedback') {
      const isChargeback = paymentStatus === 'charged_back' || paymentStatus === 'chargedback';
      const terminalStatus = isChargeback ? 'CHARGEBACK' : 'REFUNDED';
      if (isChargeback) update.chargebackAt = current.chargebackAt || now;
      else update.refundedAt = current.refundedAt || now;

      if (resolved.kind === 'NEXORA') {
        // A provider reversal is authoritative for the payment ledger, but it
        // must not fabricate a completed service reversal. Completed orders
        // remain completed; chargebacks are flagged as disputes for follow-up.
        if (currentStatus === 'PAYMENT_PENDING' || currentStatus === 'PAID') update.status = terminalStatus;
        else if (currentStatus === 'REFUNDED' || currentStatus === 'CHARGEBACK') update.status = currentStatus;
        else update.status = terminalStatus;
        const orderId = String(current.orderId || '').trim();
        if (orderId) {
          const orderRef = db.collection('orders').doc(orderId);
          const orderSnap = await tx.get(orderRef);
          if (orderSnap.exists) {
            const order = orderSnap.data() || {};
            const orderStatus = String(order.status || '').toUpperCase();
            if (isChargeback && ['PENDING', 'PAID', 'COMPLETED'].includes(orderStatus)) {
              tx.update(orderRef, { status: 'DISPUTED', disputeReason: 'MERCADO_PAGO_CHARGEBACK', disputeAt: now, updatedAt: now });
            } else if (!isChargeback && ['PENDING', 'PAID'].includes(orderStatus)) {
              tx.update(orderRef, { status: 'CANCELLED', cancellationReason: 'MERCADO_PAGO_REFUND', cancelledAt: now, updatedAt: now });
            }
          }
        }
      } else if (['PAYMENT_PENDING', 'CREATED', 'PAID', 'SERVICE_IN_PROGRESS', 'SERVICE_COMPLETED'].includes(currentStatus)) {
        // Preserve the existing Conexa service state while recording the
        // financial reversal. Business/service reversal remains a separate
        // workflow and is never inferred from a provider notification.
        update.status = currentStatus === 'PAYMENT_PENDING' || currentStatus === 'CREATED' ? 'CANCELLED' : terminalStatus;
      }
      tx.update(resolved.ref, update);
      return { status: 'UPDATED', transactionId, paymentStatus };
    }

    if (paymentStatus === 'cancelled' && ['PAYMENT_PENDING', 'CREATED'].includes(currentStatus)) {
      update.status = 'CANCELLED'; update.cancelledAt = current.cancelledAt || now;
    }
    tx.update(resolved.ref, update);
    return { status: 'UPDATED', transactionId, paymentStatus };
  });
}

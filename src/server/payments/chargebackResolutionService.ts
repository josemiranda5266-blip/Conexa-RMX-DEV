import { FieldValue } from 'firebase-admin/firestore';
import { reversalLedgerKey, reversalReason, resolveEscrowTransition, type MPChargebackCase } from '@super-app/shared-payments';
import { getAdminDb } from '../firebaseAdmin.js';

const CASES = 'chargebackCases';
const PAYMENTS = 'paymentTransactions';
const ORDERS = 'orders';
const ESCROWS = 'escrows';
const REVERSALS = 'financialReversals';

type ChargebackStatus = 'OPENED' | 'UNDER_REVIEW' | 'RESOLVED_FAVORABLE' | 'RESOLVED_UNFAVORABLE' | 'EXPIRED';

export interface ChargebackCaseRecord {
  id: string;
  paymentTransactionId: string;
  providerPaymentId: string;
  orderId?: string;
  buyerId?: string;
  sellerId?: string;
  merchantId?: string;
  amountArs: number;
  currency: 'ARS';
  status: ChargebackStatus;
  coverageApplied?: boolean;
  reason?: string;
  responseDeadline?: string;
  evidence: unknown[];
  lastWebhookAt: string;
  lastWebhookAction?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolutionReason?: string;
}

function normalizeStatus(value: unknown): ChargebackStatus {
  const status = String(value || '').toUpperCase();
  if (status === 'RESOLVED_FAVORABLE' || status === 'RESOLVED_UNFAVORABLE' || status === 'EXPIRED' || status === 'UNDER_REVIEW') return status;
  return 'OPENED';
}
function normalizedCoverage(value: unknown): boolean | undefined { if (value === true || value === false) return value; return undefined; }

export async function openOrUpdateChargebackCase(input: { chargeback: MPChargebackCase; paymentTransactionId: string; merchantId?: string; webhookAction?: string; receivedAt?: string }): Promise<ChargebackCaseRecord> {
  const db = getAdminDb();
  const now = input.receivedAt || new Date().toISOString();
  const paymentRef = db.collection(PAYMENTS).doc(input.paymentTransactionId);
  const caseRef = db.collection(CASES).doc(String(input.chargeback.id));
  return db.runTransaction(async tx => {
    const paymentSnap = await tx.get(paymentRef);
    if (!paymentSnap.exists) throw new Error('PAYMENT_TRANSACTION_NOT_FOUND');
    const payment = paymentSnap.data() || {};
    if (String(payment.providerPaymentId || '') !== String(input.chargeback.paymentId || '')) throw new Error('CHARGEBACK_PAYMENT_MISMATCH');
    const existingSnap = await tx.get(caseRef);
    const existing = existingSnap.exists ? existingSnap.data() || {} : {};
    const existingStatus = existingSnap.exists ? normalizeStatus(existing.status) : 'OPENED';
    const incomingCoverage = normalizedCoverage(input.chargeback.coverageApplied);
    const record: ChargebackCaseRecord = {
      id: caseRef.id, paymentTransactionId: paymentRef.id, providerPaymentId: String(input.chargeback.paymentId),
      orderId: payment.orderId ? String(payment.orderId) : undefined, buyerId: payment.buyerId ? String(payment.buyerId) : undefined,
      sellerId: payment.sellerId ? String(payment.sellerId) : (payment.merchantId ? String(payment.merchantId) : undefined),
      merchantId: input.merchantId || (payment.merchantId ? String(payment.merchantId) : undefined), amountArs: Number(input.chargeback.amount), currency: 'ARS',
      status: existingSnap.exists ? existingStatus : 'OPENED', coverageApplied: incomingCoverage,
      reason: input.chargeback.reason || (existing.reason ? String(existing.reason) : undefined),
      responseDeadline: input.chargeback.responseDeadline || (existing.responseDeadline ? String(existing.responseDeadline) : undefined),
      evidence: Array.isArray(existing.evidence) ? existing.evidence : [], lastWebhookAt: now, lastWebhookAction: input.webhookAction,
      createdAt: existing.createdAt ? String(existing.createdAt) : now, updatedAt: now,
      resolvedAt: existing.resolvedAt ? String(existing.resolvedAt) : undefined, resolutionReason: existing.resolutionReason ? String(existing.resolutionReason) : undefined,
    };
    if (existingStatus === 'RESOLVED_FAVORABLE' || existingStatus === 'RESOLVED_UNFAVORABLE') {
      record.status = existingStatus;
      record.coverageApplied = existing.coverageApplied === true || existing.coverageApplied === false ? existing.coverageApplied : incomingCoverage;
      record.resolvedAt = existing.resolvedAt ? String(existing.resolvedAt) : undefined;
      record.resolutionReason = existing.resolutionReason ? String(existing.resolutionReason) : undefined;
    }
    tx.set(caseRef, record, { merge: true });
    return record;
  });
}

export async function resolveChargebackCase(chargebackId: string, coverageApplied: boolean, resolutionReason: string): Promise<{ status: 'RESOLVED_FAVORABLE' | 'RESOLVED_UNFAVORABLE'; paymentTransactionId: string }> {
  if (!chargebackId?.trim()) throw new Error('CHARGEBACK_ID_REQUIRED');
  if (coverageApplied !== true && coverageApplied !== false) throw new Error('COVERAGE_RESULT_REQUIRED');
  const reason = resolutionReason.trim().slice(0, 1000);
  if (!reason) throw new Error('RESOLUTION_REASON_REQUIRED');
  const db = getAdminDb();
  const caseRef = db.collection(CASES).doc(chargebackId.trim());
  return db.runTransaction(async tx => {
    const caseSnap = await tx.get(caseRef);
    if (!caseSnap.exists) throw new Error('CHARGEBACK_CASE_NOT_FOUND');
    const chargeback = caseSnap.data() || {};
    const paymentId = String(chargeback.paymentTransactionId || '').trim();
    const providerPaymentId = String(chargeback.providerPaymentId || '').trim();
    if (!paymentId || !providerPaymentId) throw new Error('CHARGEBACK_PAYMENT_REFERENCE_MISSING');
    const paymentRef = db.collection(PAYMENTS).doc(paymentId);
    const paymentSnap = await tx.get(paymentRef);
    if (!paymentSnap.exists) throw new Error('PAYMENT_TRANSACTION_NOT_FOUND');
    const payment = paymentSnap.data() || {};
    if (String(payment.providerPaymentId || '') !== providerPaymentId) throw new Error('CHARGEBACK_PAYMENT_MISMATCH');
    const finalStatus: ChargebackStatus = coverageApplied ? 'RESOLVED_FAVORABLE' : 'RESOLVED_UNFAVORABLE';
    const currentCaseStatus = normalizeStatus(chargeback.status);
    if (currentCaseStatus === finalStatus && chargeback.coverageApplied === coverageApplied) return { status: finalStatus, paymentTransactionId: paymentId };
    if (currentCaseStatus === 'RESOLVED_FAVORABLE' || currentCaseStatus === 'RESOLVED_UNFAVORABLE') throw new Error('CHARGEBACK_ALREADY_RESOLVED_DIFFERENTLY');
    const paymentStatus = String(payment.status || '').toUpperCase();
    const refundStatus = String(payment.refundStatus || 'NONE').toUpperCase();
    if (coverageApplied && ['REFUNDED', 'CANCELLED', 'CHARGEBACK'].includes(paymentStatus)) throw new Error('CHARGEBACK_RESOLUTION_CONFLICT_WITH_PAYMENT_STATE');
    if (!coverageApplied && paymentStatus === 'REFUNDED') throw new Error('CHARGEBACK_RESOLUTION_CONFLICT_WITH_REFUND');
    if (['PROCESSING', 'REQUESTED'].includes(refundStatus)) throw new Error('CHARGEBACK_RESOLUTION_BLOCKED_BY_REFUND');
    const now = new Date().toISOString();
    const orderId = String(payment.orderId || chargeback.orderId || '').trim();
    const orderRef = orderId ? db.collection(ORDERS).doc(orderId) : null;
    const orderSnap = orderRef ? await tx.get(orderRef) : null;
    const escrowRef = orderId ? db.collection(ESCROWS).doc(`escrow:${orderId}`) : null;
    const escrowSnap = escrowRef ? await tx.get(escrowRef) : null;

    if (coverageApplied) {
      // A favorable provider outcome is only a settlement repair for a payment
      // that was previously moved into the chargeback dispute state. Requiring
      // both linked records prevents silently settling a payment with a missing
      // or inconsistent escrow/order state.
      const orderStatus = orderSnap?.exists ? String(orderSnap.data()?.status || '').toUpperCase() : '';
      const escrowStatus = escrowSnap?.exists ? String(escrowSnap.data()?.status || '').toUpperCase() : '';
      if (!orderSnap?.exists || !escrowSnap?.exists || orderStatus !== 'DISPUTED' || escrowStatus !== 'DISPUTED') {
        throw new Error('CHARGEBACK_RESOLUTION_REQUIRES_DISPUTED_ORDER_ESCROW');
      }
      tx.update(paymentRef, { status: 'PAID', paymentStatus: 'approved', chargebackResolvedAt: now, chargebackResolution: 'FAVORABLE', chargebackResolutionReason: reason, settlementStatus: 'SETTLED', settledAt: now, updatedAt: FieldValue.serverTimestamp() });
      const order = orderSnap.data() || {};
      tx.update(orderRef!, { status: 'COMPLETED', completedAt: now, disputeResolvedAt: now, disputeResolution: 'CHARGEBACK_FAVORABLE', escrowReleasedAt: now, updatedAt: FieldValue.serverTimestamp() });
      if (order.requiresInstallation) {
        const outboxRef = db.collection('eventOutbox').doc();
        tx.create(outboxRef, { id: outboxRef.id, type: 'NEXORA_ORDER_COMPLETED', occurredAt: now, producer: 'NEXORA', payload: { eventId: outboxRef.id, type: 'NEXORA_ORDER_COMPLETED', occurredAt: now, userId: String(order.buyerId || chargeback.buyerId || payment.buyerId || ''), orderId, listingIds: Array.isArray(order.items) ? order.items.map((item: any) => String(item.listingId)) : [], requiresInstallation: true }, status: 'PENDING', attempts: 0 });
      }
      const transition = resolveEscrowTransition('DISPUTED', 'CHARGEBACK_FAVORABLE');
      if (transition.changed) tx.update(escrowRef!, { status: transition.status, releasedAt: now, releaseReason: 'ADMIN_RESOLUTION', updatedAt: now });
    } else {
      const orderStatus = orderSnap?.exists ? String(orderSnap.data()?.status || '').toUpperCase() : '';
      const escrowStatus = escrowSnap?.exists ? String(escrowSnap.data()?.status || '').toUpperCase() : '';

      tx.update(paymentRef, { status: 'CHARGEBACK', paymentStatus: 'charged_back', chargebackAt: payment.chargebackAt || now, chargebackResolvedAt: now, chargebackResolution: 'UNFAVORABLE', chargebackResolutionReason: reason, updatedAt: FieldValue.serverTimestamp() });

      if (orderRef && orderSnap?.exists) {
        if (orderStatus === 'COMPLETED') {
          // A lost chargeback after fulfillment cannot truthfully roll the order
          // back to CANCELLED: inventory, installation, events and reputation may
          // already have been finalized. Preserve the fulfillment history and
          // record the financial loss separately.
          tx.update(orderRef, {
            chargebackResolution: 'UNFAVORABLE',
            chargebackResolutionReason: reason,
            chargebackLostAt: now,
            financialStatus: 'CHARGEBACK',
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          tx.update(orderRef, { status: 'CANCELLED', cancellationReason: 'MERCADO_PAGO_CHARGEBACK_LOST', cancelledAt: now, updatedAt: FieldValue.serverTimestamp() });
        }
      }

      // Only a still-held/disputed escrow can be transitioned to REFUNDED here.
      // A RELEASED escrow represents an already-completed fulfillment and must
      // remain an immutable fulfillment record while the financial reversal is
      // recorded separately below.
      if (escrowRef && escrowSnap?.exists && ['HELD', 'DISPUTED'].includes(escrowStatus)) {
        const transition = resolveEscrowTransition(escrowStatus as any, 'CHARGEBACK_LOST');
        if (transition.changed) tx.update(escrowRef, { status: transition.status, refundedAt: now, updatedAt: now });
      }

      const reversalRef = db.collection(REVERSALS).doc(reversalLedgerKey(providerPaymentId, 'CHARGEBACK'));
      const reversalSnap = await tx.get(reversalRef);
      if (!reversalSnap.exists) tx.create(reversalRef, { id: reversalRef.id, domain: 'NEXORA', paymentTransactionId: paymentId, providerPaymentId, orderId, kind: 'CHARGEBACK', amountArs: Number(payment.amountArs || chargeback.amount || 0), currency: 'ARS', reason: reversalReason('CHARGEBACK', reason), confirmedAt: now, source: 'MERCADO_PAGO_CHARGEBACK_RESOLUTION' });
    }
    tx.update(caseRef, { status: finalStatus, coverageApplied, resolutionReason: reason, resolvedAt: now, updatedAt: now, lastWebhookAt: chargeback.lastWebhookAt || now });
    return { status: finalStatus, paymentTransactionId: paymentId };
  });
}

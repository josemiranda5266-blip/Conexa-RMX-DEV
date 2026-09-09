import { FieldValue } from 'firebase-admin/firestore';
import { reversalLedgerKey, reversalReason, resolveEscrowTransition, type MPChargebackCase } from '@super-app/shared-payments';
import { getDb } from '../firebaseAdmin.js';

const CASES = 'chargebackCases';
const PAYMENTS = 'paymentTransactions';
const ORDERS = 'orders';
const ESCROWS = 'escrows';
const REVERSALS = 'financialReversals';
const LISTINGS = 'listings';
type ChargebackStatus = 'OPENED' | 'UNDER_REVIEW' | 'RESOLVED_FAVORABLE' | 'RESOLVED_UNFAVORABLE' | 'RESOLVED_BY_REFUND' | 'EXPIRED';
export interface ChargebackCaseRecord { id: string; paymentTransactionId: string; providerPaymentId: string; orderId?: string; buyerId?: string; sellerId?: string; merchantId?: string; amountArs: number; currency: 'ARS'; status: ChargebackStatus; coverageApplied?: boolean; reason?: string; responseDeadline?: string; evidence: unknown[]; lastWebhookAt: string; lastWebhookAction?: string; createdAt: string; updatedAt: string; resolvedAt?: string; resolutionReason?: string; }
function normalizeStatus(value: unknown): ChargebackStatus { const status = String(value || '').toUpperCase(); if (status === 'RESOLVED_FAVORABLE' || status === 'RESOLVED_UNFAVORABLE' || status === 'RESOLVED_BY_REFUND' || status === 'EXPIRED' || status === 'UNDER_REVIEW') return status; return 'OPENED'; }
function normalizedCoverage(value: unknown): boolean | undefined { if (value === true || value === false) return value; return undefined; }
function orderItems(order: Record<string, unknown>): Array<{ listingId: string; quantity: number }> { return Array.isArray(order.items) ? order.items.map((item: any) => ({ listingId: String(item?.listingId || '').trim(), quantity: Number(item?.quantity || 0) })).filter(item => item.listingId && Number.isInteger(item.quantity) && item.quantity > 0) : []; }
async function reconcileDisputedInventory(tx: FirebaseFirestore.Transaction, db: FirebaseFirestore.Firestore, orderId: string, order: Record<string, unknown>, mode: 'FAVORABLE' | 'UNFAVORABLE', now: string) {
  const items = orderItems(order);
  const refs = items.map(item => db.collection(LISTINGS).doc(item.listingId));
  const snaps = await Promise.all(refs.map(ref => tx.get(ref)));
  for (let index = 0; index < snaps.length; index += 1) {
    const snap = snaps[index];
    if (!snap.exists) continue;
    const listing = snap.data() || {};
    const owner = String(listing.reservedByOrderId || '').trim();
    if (owner && owner !== orderId) throw new Error('LISTING_RESERVATION_MISMATCH');
    const quantity = items[index].quantity;
    const currentStock = Number.isInteger(listing.stock) && Number(listing.stock) >= 0 ? Number(listing.stock) : 0;
    if (mode === 'FAVORABLE') {
      if (owner !== orderId) continue;
      tx.update(refs[index], { reservedQuantity: 0, reservedByOrderId: FieldValue.delete(), reservationExpiresAt: FieldValue.delete(), status: currentStock > 0 ? 'Disponible' : 'Vendido', updatedAt: FieldValue.serverTimestamp() });
    } else {
      const reversalRef = db.collection(REVERSALS).doc(`inventory:chargeback:${orderId}:${items[index].listingId}`);
      const reversalSnap = await tx.get(reversalRef);
      if (reversalSnap.exists) continue;
      const restoredStock = currentStock + quantity;
      tx.update(refs[index], { stock: restoredStock, status: restoredStock > 0 ? 'Disponible' : 'Vendido', reservedQuantity: 0, reservedByOrderId: FieldValue.delete(), reservationExpiresAt: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
      tx.create(reversalRef, { id: reversalRef.id, domain: 'NEXORA', orderId, listingId: items[index].listingId, kind: 'INVENTORY', source: 'MERCADO_PAGO_CHARGEBACK_RESOLUTION', reason: 'CHARGEBACK_UNFAVORABLE_INVENTORY_RESTORE', quantity, createdAt: now });
    }
  }
}

export async function absorbChargebackCasesForRefund(paymentTransactionId: string, resolvedAt = new Date().toISOString()): Promise<number> {
  if (!paymentTransactionId?.trim()) throw new Error('PAYMENT_TRANSACTION_ID_REQUIRED');
  const db = getDb(); const paymentRef = db.collection(PAYMENTS).doc(paymentTransactionId.trim());
  return db.runTransaction(async tx => {
    const paymentSnap = await tx.get(paymentRef); if (!paymentSnap.exists) throw new Error('PAYMENT_TRANSACTION_NOT_FOUND');
    const payment = paymentSnap.data() || {}; if (String(payment.status || '').toUpperCase() !== 'REFUNDED') return 0;
    const orderId = String(payment.orderId || '').trim(); const orderRef = orderId ? db.collection(ORDERS).doc(orderId) : null; const orderSnap = orderRef ? await tx.get(orderRef) : null;
    const escrowRef = orderId ? db.collection(ESCROWS).doc(`escrow:${orderId}`) : null; const escrowSnap = escrowRef ? await tx.get(escrowRef) : null;
    const orderStatus = orderSnap?.exists ? String(orderSnap.data()?.status || '').toUpperCase() : ''; const escrowStatus = escrowSnap?.exists ? String(escrowSnap.data()?.status || '').toUpperCase() : '';
    if (orderRef && orderSnap?.exists && ['PENDING', 'PAID', 'DISPUTED'].includes(orderStatus)) tx.update(orderRef, { status: 'CANCELLED', cancellationReason: 'MERCADO_PAGO_REFUND_ABSORBED_CHARGEBACK', cancelledAt: resolvedAt, updatedAt: FieldValue.serverTimestamp() });
    else if (orderRef && orderSnap?.exists && orderStatus === 'COMPLETED') tx.update(orderRef, { financialStatus: 'REFUNDED', refundAbsorbedChargebackAt: resolvedAt, updatedAt: FieldValue.serverTimestamp() });
    if (escrowRef && escrowSnap?.exists && ['PENDING', 'HELD', 'DISPUTED'].includes(escrowStatus)) tx.update(escrowRef, { status: 'REFUNDED', refundedAt: resolvedAt, refundReason: 'MERCADO_PAGO_REFUND_ABSORBED_CHARGEBACK', updatedAt: resolvedAt });
    const snapshot = await tx.get(db.collection(CASES).where('paymentTransactionId', '==', paymentRef.id)); let absorbed = 0;
    snapshot.docs.forEach(caseSnap => { const status = normalizeStatus(caseSnap.data()?.status); if (!['OPENED', 'UNDER_REVIEW', 'EXPIRED'].includes(status)) return; tx.update(caseSnap.ref, { status: 'RESOLVED_BY_REFUND', resolutionReason: 'REFUND_CONFIRMED_ABSORBED_CHARGEBACK', resolvedAt, updatedAt: resolvedAt, lastWebhookAction: 'refund.absorbed_chargeback' }); absorbed += 1; });
    return absorbed;
  });
}

export async function openOrUpdateChargebackCase(input: { chargeback: MPChargebackCase; paymentTransactionId: string; merchantId?: string; webhookAction?: string; receivedAt?: string }): Promise<ChargebackCaseRecord> {
  const db = getDb(); const now = input.receivedAt || new Date().toISOString(); const paymentRef = db.collection(PAYMENTS).doc(input.paymentTransactionId); const caseRef = db.collection(CASES).doc(String(input.chargeback.id));
  return db.runTransaction(async tx => {
    const paymentSnap = await tx.get(paymentRef); if (!paymentSnap.exists) throw new Error('PAYMENT_TRANSACTION_NOT_FOUND'); const payment = paymentSnap.data() || {};
    if (String(payment.providerPaymentId || '') !== String(input.chargeback.paymentId || '')) throw new Error('CHARGEBACK_PAYMENT_MISMATCH');
    const existingSnap = await tx.get(caseRef); const existing = existingSnap.exists ? existingSnap.data() || {} : {}; const existingStatus = existingSnap.exists ? normalizeStatus(existing.status) : 'OPENED'; const incomingCoverage = normalizedCoverage(input.chargeback.coverageApplied);
    const paymentAlreadyRefunded = String(payment.status || '').toUpperCase() === 'REFUNDED' || String(payment.refundStatus || '').toUpperCase() === 'CONFIRMED';
    const record: ChargebackCaseRecord = { id: caseRef.id, paymentTransactionId: paymentRef.id, providerPaymentId: String(input.chargeback.paymentId), orderId: payment.orderId ? String(payment.orderId) : undefined, buyerId: payment.buyerId ? String(payment.buyerId) : undefined, sellerId: payment.sellerId ? String(payment.sellerId) : (payment.merchantId ? String(payment.merchantId) : undefined), merchantId: input.merchantId || (payment.merchantId ? String(payment.merchantId) : undefined), amountArs: Number(input.chargeback.amount), currency: 'ARS', status: existingSnap.exists ? existingStatus : 'OPENED', coverageApplied: incomingCoverage, reason: input.chargeback.reason || (existing.reason ? String(existing.reason) : undefined), responseDeadline: input.chargeback.responseDeadline || (existing.responseDeadline ? String(existing.responseDeadline) : undefined), evidence: Array.isArray(existing.evidence) ? existing.evidence : [], lastWebhookAt: now, lastWebhookAction: input.webhookAction, createdAt: existing.createdAt ? String(existing.createdAt) : now, updatedAt: now, resolvedAt: existing.resolvedAt ? String(existing.resolvedAt) : undefined, resolutionReason: existing.resolutionReason ? String(existing.resolutionReason) : undefined };
    if (paymentAlreadyRefunded && ['OPENED', 'UNDER_REVIEW', 'EXPIRED'].includes(existingStatus)) { record.status = 'RESOLVED_BY_REFUND'; record.resolutionReason = 'REFUND_CONFIRMED_ABSORBED_CHARGEBACK'; record.resolvedAt = now; }
    else if (existingStatus === 'RESOLVED_FAVORABLE' || existingStatus === 'RESOLVED_UNFAVORABLE' || existingStatus === 'RESOLVED_BY_REFUND') { record.status = existingStatus; record.coverageApplied = existing.coverageApplied === true || existing.coverageApplied === false ? existing.coverageApplied : incomingCoverage; record.resolvedAt = existing.resolvedAt ? String(existing.resolvedAt) : undefined; record.resolutionReason = existing.resolutionReason ? String(existing.resolutionReason) : undefined; }
    const activeCase = ['OPENED', 'UNDER_REVIEW'].includes(record.status); const orderId = String(payment.orderId || '').trim(); const orderRef = orderId ? db.collection(ORDERS).doc(orderId) : null; const escrowRef = orderId ? db.collection(ESCROWS).doc(`escrow:${orderId}`) : null; const orderSnap = orderRef ? await tx.get(orderRef) : null; const escrowSnap = escrowRef ? await tx.get(escrowRef) : null;
    if (activeCase && !paymentAlreadyRefunded) {
      tx.update(paymentRef, { chargebackNoticeAt: payment.chargebackNoticeAt || now, chargebackPendingResolution: true, updatedAt: FieldValue.serverTimestamp() });
      if (orderRef && orderSnap?.exists) { const orderStatus = String(orderSnap.data()?.status || '').toUpperCase(); if (['PENDING', 'PAID', 'COMPLETED'].includes(orderStatus)) tx.update(orderRef, { status: 'DISPUTED', disputeReason: 'MERCADO_PAGO_CHARGEBACK', disputeAt: now, updatedAt: FieldValue.serverTimestamp() }); }
      if (escrowRef && escrowSnap?.exists) { const escrowStatus = String(escrowSnap.data()?.status || '').toUpperCase(); if (['PENDING', 'HELD'].includes(escrowStatus)) tx.update(escrowRef, { status: 'DISPUTED', disputedAt: now, disputeReason: 'MERCADO_PAGO_CHARGEBACK', updatedAt: now }); }
    }
    tx.set(caseRef, record, { merge: true }); return record;
  });
}

export async function resolveChargebackCase(chargebackId: string, coverageApplied: boolean, resolutionReason: string): Promise<{ status: 'RESOLVED_FAVORABLE' | 'RESOLVED_UNFAVORABLE'; paymentTransactionId: string }> {
  if (!chargebackId?.trim()) throw new Error('CHARGEBACK_ID_REQUIRED'); if (coverageApplied !== true && coverageApplied !== false) throw new Error('COVERAGE_RESULT_REQUIRED'); const reason = resolutionReason.trim().slice(0, 1000); if (!reason) throw new Error('RESOLUTION_REASON_REQUIRED');
  const db = getDb(); const caseRef = db.collection(CASES).doc(chargebackId.trim());
  return db.runTransaction(async tx => {
    const caseSnap = await tx.get(caseRef); if (!caseSnap.exists) throw new Error('CHARGEBACK_CASE_NOT_FOUND'); const chargeback = caseSnap.data() || {}; const paymentId = String(chargeback.paymentTransactionId || '').trim(); const providerPaymentId = String(chargeback.providerPaymentId || '').trim();
    if (!paymentId || !providerPaymentId) throw new Error('CHARGEBACK_PAYMENT_REFERENCE_MISSING'); const paymentRef = db.collection(PAYMENTS).doc(paymentId); const paymentSnap = await tx.get(paymentRef); if (!paymentSnap.exists) throw new Error('PAYMENT_TRANSACTION_NOT_FOUND'); const payment = paymentSnap.data() || {};
    if (String(payment.providerPaymentId || '') !== providerPaymentId) throw new Error('CHARGEBACK_PAYMENT_MISMATCH'); const finalStatus: ChargebackStatus = coverageApplied ? 'RESOLVED_FAVORABLE' : 'RESOLVED_UNFAVORABLE'; const currentCaseStatus = normalizeStatus(chargeback.status);
    if (currentCaseStatus === 'RESOLVED_BY_REFUND') throw new Error('CHARGEBACK_ALREADY_RESOLVED_BY_REFUND'); if (currentCaseStatus === finalStatus && chargeback.coverageApplied === coverageApplied) return { status: finalStatus, paymentTransactionId: paymentId }; if (currentCaseStatus === 'RESOLVED_FAVORABLE' || currentCaseStatus === 'RESOLVED_UNFAVORABLE') throw new Error('CHARGEBACK_ALREADY_RESOLVED_DIFFERENTLY');
    const paymentStatus = String(payment.status || '').toUpperCase(); const refundStatus = String(payment.refundStatus || 'NONE').toUpperCase(); if (paymentStatus === 'REFUNDED' || refundStatus === 'CONFIRMED') throw new Error('CHARGEBACK_RESOLUTION_CONFLICT_WITH_REFUND'); if (coverageApplied && ['CANCELLED', 'CHARGEBACK'].includes(paymentStatus)) throw new Error('CHARGEBACK_RESOLUTION_CONFLICT_WITH_PAYMENT_STATE'); if (['PROCESSING', 'REQUESTED'].includes(refundStatus)) throw new Error('CHARGEBACK_RESOLUTION_BLOCKED_BY_REFUND');
    const now = new Date().toISOString(); const orderId = String(payment.orderId || chargeback.orderId || '').trim(); const orderRef = orderId ? db.collection(ORDERS).doc(orderId) : null; const orderSnap = orderRef ? await tx.get(orderRef) : null; const escrowRef = orderId ? db.collection(ESCROWS).doc(`escrow:${orderId}`) : null; const escrowSnap = escrowRef ? await tx.get(escrowRef) : null;
    if (coverageApplied) {
      const orderStatus = orderSnap?.exists ? String(orderSnap.data()?.status || '').toUpperCase() : ''; const escrowStatus = escrowSnap?.exists ? String(escrowSnap.data()?.status || '').toUpperCase() : ''; const wasAlreadySettled = orderStatus === 'DISPUTED' && escrowStatus === 'RELEASED'; const activeDispute = orderStatus === 'DISPUTED' && escrowStatus === 'DISPUTED';
      if ((!activeDispute && !wasAlreadySettled) || !orderSnap?.exists || !escrowSnap?.exists) throw new Error('CHARGEBACK_RESOLUTION_REQUIRES_DISPUTED_ORDER_ESCROW');
      const order = orderSnap.data() || {};
      if (!wasAlreadySettled) await reconcileDisputedInventory(tx, db, orderId, order, 'FAVORABLE', now);
      tx.update(paymentRef, { status: 'PAID', paymentStatus: 'approved', chargebackPendingResolution: false, chargebackResolvedAt: now, chargebackResolution: 'FAVORABLE', chargebackResolutionReason: reason, settlementStatus: 'SETTLED', settledAt: now, updatedAt: FieldValue.serverTimestamp() });
      tx.update(orderRef!, { status: 'COMPLETED', completedAt: order.completedAt || now, disputeResolvedAt: now, disputeResolution: 'CHARGEBACK_FAVORABLE', ...(wasAlreadySettled ? {} : { escrowReleasedAt: now }), updatedAt: FieldValue.serverTimestamp() });
      if (order.requiresInstallation && !wasAlreadySettled) { const outboxRef = db.collection('eventOutbox').doc(); tx.create(outboxRef, { id: outboxRef.id, type: 'NEXORA_ORDER_COMPLETED', occurredAt: now, producer: 'NEXORA', payload: { eventId: outboxRef.id, type: 'NEXORA_ORDER_COMPLETED', occurredAt: now, userId: String(order.buyerId || chargeback.buyerId || payment.buyerId || ''), orderId, listingIds: orderItems(order).map(item => item.listingId), requiresInstallation: true }, status: 'PENDING', attempts: 0 }); }
      if (!wasAlreadySettled) { const transition = resolveEscrowTransition('DISPUTED', 'CHARGEBACK_FAVORABLE'); if (transition.changed) tx.update(escrowRef!, { status: transition.status, releasedAt: now, releaseReason: 'ADMIN_RESOLUTION', updatedAt: now }); }
    } else {
      const orderStatus = orderSnap?.exists ? String(orderSnap.data()?.status || '').toUpperCase() : ''; const escrowStatus = escrowSnap?.exists ? String(escrowSnap.data()?.status || '').toUpperCase() : '';
      if (orderSnap?.exists) await reconcileDisputedInventory(tx, db, orderId, orderSnap.data() || {}, 'UNFAVORABLE', now);
      tx.update(paymentRef, { status: 'CHARGEBACK', paymentStatus: 'charged_back', chargebackPendingResolution: false, chargebackAt: payment.chargebackAt || now, chargebackResolvedAt: now, chargebackResolution: 'UNFAVORABLE', chargebackResolutionReason: reason, updatedAt: FieldValue.serverTimestamp() });
      if (orderRef && orderSnap?.exists) { if (orderStatus === 'COMPLETED') tx.update(orderRef, { chargebackResolution: 'UNFAVORABLE', chargebackResolutionReason: reason, chargebackLostAt: now, financialStatus: 'CHARGEBACK', updatedAt: FieldValue.serverTimestamp() }); else tx.update(orderRef, { status: 'CANCELLED', cancellationReason: 'MERCADO_PAGO_CHARGEBACK_LOST', cancelledAt: now, updatedAt: FieldValue.serverTimestamp() }); }
      if (escrowRef && escrowSnap?.exists && ['HELD', 'DISPUTED'].includes(escrowStatus)) { const transition = resolveEscrowTransition(escrowStatus as any, 'CHARGEBACK_LOST'); if (transition.changed) tx.update(escrowRef, { status: transition.status, refundedAt: now, updatedAt: now }); }
      const reversalRef = db.collection(REVERSALS).doc(reversalLedgerKey(providerPaymentId, 'CHARGEBACK')); const reversalSnap = await tx.get(reversalRef); if (!reversalSnap.exists) tx.create(reversalRef, { id: reversalRef.id, domain: 'NEXORA', paymentTransactionId: paymentId, providerPaymentId, orderId, kind: 'CHARGEBACK', amountArs: Number(payment.amountArs || chargeback.amount || 0), currency: 'ARS', reason: reversalReason('CHARGEBACK', reason), confirmedAt: now, source: 'MERCADO_PAGO_CHARGEBACK_RESOLUTION' });
    }
    tx.update(caseRef, { status: finalStatus, coverageApplied, resolutionReason: reason, resolvedAt: now, updatedAt: now, lastWebhookAt: chargeback.lastWebhookAt || now }); return { status: finalStatus, paymentTransactionId: paymentId };
  });
}

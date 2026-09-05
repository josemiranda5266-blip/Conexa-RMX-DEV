import { FieldValue } from 'firebase-admin/firestore';
import { resolveSettlementTransition, reversalLedgerKey, reversalReason, type ProviderPaymentStatus } from '@super-app/shared-payments';
import { getAdminDb } from '../firebaseAdmin.js';
import { MercadoPagoOAuthConnection } from './mercadoPagoOAuthTokenStore.js';
import { fetchMercadoPagoPaymentWithConnection } from './mercadoPagoPayment.js';

const TRANSACTION_COLLECTION = 'transactions';
const NEXORA_PAYMENT_COLLECTION = 'paymentTransactions';
const ESCROW_COLLECTION = 'escrows';
const ESCROW_AUTO_RELEASE_HOURS = 72;
type ReconciledProviderStatus = ProviderPaymentStatus;
export type PaymentReconciliationResult =
  | { status: 'PAID'; transactionId: string }
  | { status: 'ALREADY_PAID'; transactionId: string }
  | { status: 'UPDATED'; transactionId: string; paymentStatus: ReconciledProviderStatus }
  | { status: 'IGNORED'; reason: string };

function normalizeAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : NaN;
}
function providerStatus(payment: any): ReconciledProviderStatus {
  const status = String(payment?.status || '').trim().toLowerCase();
  const allowed: ReconciledProviderStatus[] = ['pending', 'approved', 'authorized', 'in_process', 'in_mediation', 'rejected', 'cancelled', 'refunded', 'charged_back', 'chargedback', 'unknown'];
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
async function resolveFinancialRecord(transactionId: string) {
  const db = getAdminDb();
  const [conexa, nexora] = await Promise.all([db.collection(TRANSACTION_COLLECTION).doc(transactionId).get(), db.collection(NEXORA_PAYMENT_COLLECTION).doc(transactionId).get()]);
  if (conexa.exists) return { ref: db.collection(TRANSACTION_COLLECTION).doc(transactionId), data: conexa.data() || {}, kind: 'CONEXA' as const };
  if (nexora.exists) return { ref: db.collection(NEXORA_PAYMENT_COLLECTION).doc(transactionId), data: nexora.data() || {}, kind: 'NEXORA' as const };
  return null;
}

function writeHeldEscrow(tx: FirebaseFirestore.Transaction, db: FirebaseFirestore.Firestore, input: { orderId: string; paymentTransactionId: string; buyerId: string; sellerId: string; amountArs: number; providerPaymentId: string }, at: string) {
  const ref = db.collection(ESCROW_COLLECTION).doc(`escrow:${input.orderId}`);
  const autoReleaseAt = new Date(Date.parse(at) + ESCROW_AUTO_RELEASE_HOURS * 60 * 60_000).toISOString();
  tx.create(ref, {
    id: ref.id,
    orderId: input.orderId,
    paymentTransactionId: input.paymentTransactionId,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    amountArs: input.amountArs,
    currency: 'ARS',
    status: 'HELD',
    createdAt: at,
    heldAt: at,
    autoReleaseAt,
    provider: 'MERCADO_PAGO',
    providerPaymentId: input.providerPaymentId,
    custodyMode: 'PROVIDER_SETTLED_CONTROL',
  });
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

    const transition = resolveSettlementTransition(resolved.kind, currentStatus, paymentStatus);
    const update: Record<string, unknown> = {
      paymentStatus,
      paymentUpdatedAt: now,
      ...(resolved.kind === 'NEXORA' ? { providerPaymentId: String(paymentId) } : { mercadoPagoPaymentId: String(paymentId) }),
    };
    let orderWasSettled = false;

    if (resolved.kind === 'NEXORA' && paymentStatus === 'approved') {
      const orderId = String(current.orderId || '').trim();
      if (!orderId) return { status: 'IGNORED', reason: 'ORDER_REFERENCE_MISSING' };
      const orderRef = db.collection('orders').doc(orderId);
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) return { status: 'IGNORED', reason: 'ORDER_NOT_FOUND' };
      const order = orderSnap.data() || {};
      if (String(order.paymentTransactionId || '') !== resolved.ref.id || String(order.buyerId || '') !== String(current.buyerId || '') || String(order.sellerId || '') !== String(current.merchantId || '')) return { status: 'IGNORED', reason: 'ORDER_PAYMENT_LINK_MISMATCH' };
      const orderStatus = String(order.status || '').toUpperCase();
      if (orderStatus === 'PENDING') {
        const items = Array.isArray(order.items) ? order.items : [];
        const listingRefs = items.map((item: any) => db.collection('listings').doc(String(item.listingId)));
        const listingSnaps = await Promise.all(listingRefs.map(ref => tx.get(ref)));
        const reservationValid = listingSnaps.length === items.length && listingSnaps.every((snap, index) => {
          if (!snap.exists) return false;
          const listing = snap.data() || {};
          return String(listing.reservedByOrderId || '') === orderId && Number(listing.reservedQuantity) === Number(items[index].quantity) && listing.reservationExpiresAt && Date.parse(String(listing.reservationExpiresAt)) > Date.parse(now);
        });
        update.status = 'PAID';
        update.paidAt = current.paidAt || now;
        tx.update(orderRef, reservationValid ? { status: 'PAID', paidAt: current.paidAt || now, updatedAt: FieldValue.serverTimestamp() } : { status: 'DISPUTED', disputeReason: 'PAYMENT_AFTER_INVENTORY_RESERVATION_EXPIRY', disputeAt: now, updatedAt: FieldValue.serverTimestamp() });
        listingSnaps.forEach((snap, index) => {
          if (!snap.exists) return;
          const listing = snap.data() || {};
          if (String(listing.reservedByOrderId || '') !== orderId) return;
          const stock = Number.isInteger(listing.stock) && Number(listing.stock) >= 0 ? Number(listing.stock) : 0;
          if (reservationValid) {
            tx.update(listingRefs[index], { status: stock === 0 ? 'Vendido' : 'Disponible', reservedQuantity: 0, reservedByOrderId: FieldValue.delete(), reservationExpiresAt: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
          } else {
            const restored = stock + Number(items[index].quantity);
            tx.update(listingRefs[index], { stock: restored, status: restored > 0 ? 'Disponible' : listing.status, reservedQuantity: 0, reservedByOrderId: FieldValue.delete(), reservationExpiresAt: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
          }
        });
        orderWasSettled = reservationValid;
        if (reservationValid) {
          const escrowRef = db.collection(ESCROW_COLLECTION).doc(`escrow:${orderId}`);
          const escrowSnap = await tx.get(escrowRef);
          if (!escrowSnap.exists) writeHeldEscrow(tx, db, { orderId, paymentTransactionId: resolved.ref.id, buyerId: String(current.buyerId), sellerId: String(current.merchantId), amountArs: expectedAmount, providerPaymentId: String(paymentId) }, now);
        }
      } else if (orderStatus === 'PAID') {
        const escrowRef = db.collection(ESCROW_COLLECTION).doc(`escrow:${orderId}`);
        const escrowSnap = await tx.get(escrowRef);
        if (!escrowSnap.exists) writeHeldEscrow(tx, db, { orderId, paymentTransactionId: resolved.ref.id, buyerId: String(current.buyerId), sellerId: String(current.merchantId), amountArs: expectedAmount, providerPaymentId: String(paymentId) }, now);
      }
    }

    if (transition.paid && !(resolved.kind === 'NEXORA' && currentStatus === 'PAID')) {
      update.status = 'PAID';
      update.paidAt = current.paidAt || now;
      if (resolved.kind === 'CONEXA') update.settlementStatus = current.settlementStatus || 'PENDING';
    }
    if (transition.refunded) update.refundedAt = current.refundedAt || now;
    if (transition.chargeback) update.chargebackAt = current.chargebackAt || now;
    if (transition.cancelled) update.cancelledAt = current.cancelledAt || now;
    if (transition.changed && !orderWasSettled) update.status = transition.status;

    if (resolved.kind === 'NEXORA') {
      const orderId = String(current.orderId || '').trim();
      if (orderId && (transition.refunded || transition.chargeback)) {
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await tx.get(orderRef);
        if (orderSnap.exists) {
          const order = orderSnap.data() || {};
          const orderStatus = String(order.status || '').toUpperCase();
          if (transition.chargeback && ['PENDING', 'PAID', 'COMPLETED'].includes(orderStatus)) {
            tx.update(orderRef, { status: 'DISPUTED', disputeReason: 'MERCADO_PAGO_CHARGEBACK', disputeAt: now, updatedAt: FieldValue.serverTimestamp() });
            const escrowRef = db.collection(ESCROW_COLLECTION).doc(`escrow:${orderId}`);
            const escrowSnap = await tx.get(escrowRef);
            if (escrowSnap.exists && String(escrowSnap.data()?.status) === 'HELD') tx.update(escrowRef, { status: 'DISPUTED', disputedAt: now, disputeReason: 'MERCADO_PAGO_CHARGEBACK', updatedAt: now });
          } else if (transition.refunded && ['PENDING', 'PAID'].includes(orderStatus)) {
            const items = Array.isArray(order.items) ? order.items : [];
            const listingRefs = items.map((item: any) => db.collection('listings').doc(String(item.listingId)));
            const listingSnaps = await Promise.all(listingRefs.map(ref => tx.get(ref)));
            listingSnaps.forEach((snap, index) => {
              if (!snap.exists) return;
              const listing = snap.data() || {};
              if (String(listing.reservedByOrderId || '') !== orderId) return;
              const stock = Number.isInteger(listing.stock) && Number(listing.stock) >= 0 ? Number(listing.stock) : 0;
              const restored = stock + Number(items[index].quantity);
              tx.update(listingRefs[index], { stock: restored, status: restored > 0 ? 'Disponible' : listing.status, reservedQuantity: 0, reservedByOrderId: FieldValue.delete(), reservationExpiresAt: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
            });
            tx.update(orderRef, { status: 'CANCELLED', cancellationReason: 'MERCADO_PAGO_REFUND', cancelledAt: now, updatedAt: FieldValue.serverTimestamp() });
            const escrowRef = db.collection(ESCROW_COLLECTION).doc(`escrow:${orderId}`);
            const escrowSnap = await tx.get(escrowRef);
            if (escrowSnap.exists && ['PENDING', 'HELD', 'DISPUTED'].includes(String(escrowSnap.data()?.status))) tx.update(escrowRef, { status: 'REFUNDED', refundedAt: now, updatedAt: now });
          }
        }
      }
    }

    if (transition.refunded || transition.chargeback) {
      const kind = transition.chargeback ? 'CHARGEBACK' : 'REFUND';
      const reversalRef = db.collection('financialReversals').doc(reversalLedgerKey(String(paymentId), kind));
      const reversalSnap = await tx.get(reversalRef);
      if (!reversalSnap.exists) {
        tx.create(reversalRef, {
          id: reversalRef.id,
          domain: resolved.kind,
          paymentTransactionId: resolved.ref.id,
          providerPaymentId: String(paymentId),
          orderId: String(current.orderId || ''),
          kind,
          amountArs: expectedAmount,
          currency: 'ARS',
          reason: reversalReason(kind, payment?.status_detail),
          confirmedAt: now,
          source: 'MERCADO_PAGO_WEBHOOK',
        });
      }
    }

    tx.update(resolved.ref, update);
    if (transition.paid) return { status: currentStatus === 'PAID' ? 'ALREADY_PAID' : 'PAID', transactionId };
    return { status: 'UPDATED', transactionId, paymentStatus };
  });
}

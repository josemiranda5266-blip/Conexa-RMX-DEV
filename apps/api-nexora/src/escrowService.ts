import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { resolveEscrowTransition, type EscrowRecord } from '@super-app/shared-payments';
import { getDb } from './firebaseAdmin.js';

const COLLECTION = 'escrows';
const AUTO_RELEASE_HOURS = 72;
const now = () => new Date().toISOString();

export function escrowIdForOrder(orderId: string): string {
  const value = orderId.trim();
  if (!value) throw new Error('ORDER_ID_REQUIRED');
  return `escrow:${value}`;
}

export function createHeldEscrowInTransaction(tx: Transaction, input: {
  orderId: string;
  paymentTransactionId: string;
  buyerId: string;
  sellerId: string;
  amountArs: number;
  providerPaymentId?: string;
}, at = now()): EscrowRecord {
  const id = escrowIdForOrder(input.orderId);
  const autoReleaseAt = new Date(Date.parse(at) + AUTO_RELEASE_HOURS * 60 * 60_000).toISOString();
  const ref = getDb().collection(COLLECTION).doc(id);
  const record: EscrowRecord = {
    id, orderId: input.orderId, paymentTransactionId: input.paymentTransactionId,
    buyerId: input.buyerId, sellerId: input.sellerId, amountArs: input.amountArs,
    currency: 'ARS', status: 'HELD', createdAt: at, heldAt: at, autoReleaseAt,
    provider: 'MERCADO_PAGO', providerPaymentId: input.providerPaymentId,
    custodyMode: 'PROVIDER_SETTLED_CONTROL',
  };
  tx.set(ref, { ...record }, { merge: true });
  return record;
}

async function getEscrow(orderId: string) {
  const ref = getDb().collection(COLLECTION).doc(escrowIdForOrder(orderId));
  const snap = await ref.get();
  return { ref, snap };
}

function assertEscrowEventAllowed(status: EscrowRecord['status'], event: Parameters<typeof resolveEscrowTransition>[1]) {
  if (event === 'BUYER_CONFIRMED' || event === 'AUTO_RELEASE') {
    if (status === 'RELEASED') return;
    if (status === 'HELD') return;
    throw new Error('ESCROW_NOT_RELEASABLE');
  }
  if (event === 'DISPUTE_OPENED') {
    if (status === 'HELD' || status === 'PENDING') return;
    throw new Error('ESCROW_NOT_DISPUTABLE');
  }
  if (event === 'PAYMENT_REFUNDED') {
    if (status === 'REFUNDED') return;
    if (status === 'PENDING' || status === 'HELD' || status === 'DISPUTED') return;
    throw new Error('ESCROW_NOT_REFUNDABLE');
  }
}

async function transitionEscrow(orderId: string, event: Parameters<typeof resolveEscrowTransition>[1], actorId?: string, reason?: string) {
  const db = getDb();
  let result!: EscrowRecord;
  await db.runTransaction(async tx => {
    const escrowRef = db.collection(COLLECTION).doc(escrowIdForOrder(orderId));
    const escrowSnap = await tx.get(escrowRef);
    if (!escrowSnap.exists) throw new Error('ESCROW_NOT_FOUND');
    const current = escrowSnap.data() as EscrowRecord;
    if (actorId && current.buyerId !== actorId) throw new Error('FORBIDDEN');
    assertEscrowEventAllowed(current.status, event);
    const transition = resolveEscrowTransition(current.status, event);
    if (!transition.changed) {
      result = { id: escrowSnap.id, ...current };
      return;
    }
    const timestamp = now();
    const updates: Record<string, unknown> = { status: transition.status, updatedAt: timestamp };
    if (transition.status === 'RELEASED') {
      updates.releasedAt = timestamp;
      updates.releaseReason = event === 'AUTO_RELEASE' ? 'AUTO_RELEASE' : event === 'BUYER_CONFIRMED' ? 'BUYER_CONFIRMED' : 'ADMIN_RESOLUTION';
    }
    if (transition.status === 'DISPUTED') {
      updates.disputedAt = timestamp;
      updates.disputeReason = reason?.trim().slice(0, 1000) || 'Buyer opened a dispute';
    }
    if (transition.status === 'REFUNDED') updates.refundedAt = timestamp;
    tx.update(escrowRef, updates);

    const orderRef = db.collection('orders').doc(current.orderId);
    const paymentRef = db.collection('paymentTransactions').doc(current.paymentTransactionId);
    const orderSnap = await tx.get(orderRef);
    const paymentSnap = await tx.get(paymentRef);
    if (!orderSnap.exists || !paymentSnap.exists) throw new Error('ESCROW_LINKED_RECORD_MISSING');

    if (transition.status === 'RELEASED') {
      const order = orderSnap.data() || {};
      const orderStatus = String(order.status || '').toUpperCase();
      if (orderStatus !== 'PAID') throw new Error('ORDER_NOT_READY_FOR_RELEASE');
      tx.update(orderRef, { status: 'COMPLETED', completedAt: timestamp, updatedAt: FieldValue.serverTimestamp(), escrowReleasedAt: timestamp });
      tx.update(paymentRef, { settlementStatus: 'SETTLED', settledAt: timestamp, updatedAt: FieldValue.serverTimestamp() });
      if (order.requiresInstallation) {
        const outboxRef = db.collection('eventOutbox').doc();
        tx.create(outboxRef, {
          id: outboxRef.id, type: 'NEXORA_ORDER_COMPLETED', occurredAt: timestamp, producer: 'NEXORA',
          payload: { eventId: outboxRef.id, type: 'NEXORA_ORDER_COMPLETED', occurredAt: timestamp, userId: current.buyerId, orderId: current.orderId, listingIds: Array.isArray(order.items) ? order.items.map((item: any) => String(item.listingId)) : [], requiresInstallation: true },
          status: 'PENDING', attempts: 0,
        });
      }
    } else if (transition.status === 'DISPUTED') {
      tx.update(orderRef, { status: 'DISPUTED', disputeReason: reason?.trim().slice(0, 1000) || 'ESCROW_DISPUTE', disputeAt: timestamp, updatedAt: FieldValue.serverTimestamp() });
    } else if (transition.status === 'REFUNDED') {
      tx.update(orderRef, { status: 'CANCELLED', cancellationReason: 'ESCROW_REFUNDED', cancelledAt: timestamp, updatedAt: FieldValue.serverTimestamp() });
    }

    result = { ...current, status: transition.status, ...(updates as Partial<EscrowRecord>) } as EscrowRecord;
  });
  return result;
}

export async function confirmDelivery(orderId: string, buyerId: string) { return transitionEscrow(orderId, 'BUYER_CONFIRMED', buyerId); }
export async function openEscrowDispute(orderId: string, buyerId: string, reason: string) { if (!reason?.trim()) throw new Error('DISPUTE_REASON_REQUIRED'); return transitionEscrow(orderId, 'DISPUTE_OPENED', buyerId, reason); }
export async function autoReleaseEscrow(orderId: string) { return transitionEscrow(orderId, 'AUTO_RELEASE'); }
export async function markEscrowRefunded(orderId: string) { return transitionEscrow(orderId, 'PAYMENT_REFUNDED'); }

export async function expireAndReleaseEligibleEscrows(limit = 100) {
  const db = getDb();
  const cutoff = now();
  const snap = await db.collection(COLLECTION).where('status', '==', 'HELD').where('autoReleaseAt', '<=', cutoff).limit(Math.min(Math.max(limit, 1), 100)).get();
  let released = 0;
  for (const doc of snap.docs) {
    try { await autoReleaseEscrow(doc.id.replace(/^escrow:/, '')); released += 1; }
    catch (error) { console.error(`[ESCROW] auto-release failed for ${doc.id}:`, error); }
  }
  return { scanned: snap.size, released };
}

export async function getEscrowForOrder(orderId: string): Promise<EscrowRecord | null> {
  const { snap } = await getEscrow(orderId);
  return snap.exists ? ({ id: snap.id, ...snap.data() } as EscrowRecord) : null;
}

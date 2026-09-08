import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from './firebaseAdmin.js';
import { createNexoraCheckout, findNexoraCheckout } from './mercadoPago.js';
import type { Listing, NexoraOrder, PaymentTransaction } from '@super-app/shared-types';

const CHECKOUT_LEASE_MS = 10 * 60 * 1000;

async function assertActiveReservation(orderId: string, order: NexoraOrder, payment: PaymentTransaction): Promise<void> {
  const db = getDb();
  const orderRef = db.collection('orders').doc(orderId);
  const paymentRef = db.collection('paymentTransactions').doc(payment.id);
  const listingRefs = order.items.map(item => db.collection('listings').doc(item.listingId));
  const now = new Date().toISOString();

  const active = await db.runTransaction(async tx => {
    const [orderSnap, paymentSnap, ...listingSnaps] = await Promise.all([
      tx.get(orderRef),
      tx.get(paymentRef),
      ...listingRefs.map(ref => tx.get(ref)),
    ]);
    if (!orderSnap.exists || !paymentSnap.exists) throw new Error('PAYMENT_ORDER_MISMATCH');
    const currentOrder = orderSnap.data() as NexoraOrder;
    const currentPayment = paymentSnap.data() as PaymentTransaction;
    if (currentOrder.status !== 'PENDING' || currentPayment.status !== 'PAYMENT_PENDING') throw new Error('PAYMENT_NOT_PENDING');

    const nowMs = Date.parse(now);
    const reservationValid = listingSnaps.length === currentOrder.items.length && listingSnaps.every((snap, index) => {
      if (!snap.exists) return false;
      const listing = snap.data() as Listing;
      return String(listing.reservedByOrderId || '') === orderId
        && Number(listing.reservedQuantity) === Number(currentOrder.items[index].quantity)
        && listing.reservationExpiresAt
        && Date.parse(String(listing.reservationExpiresAt)) > nowMs;
    });
    if (reservationValid) return true;

    listingSnaps.forEach((snap, index) => {
      if (!snap.exists) return;
      const listing = snap.data() as Listing;
      if (String(listing.reservedByOrderId || '') !== orderId) return;
      const stock = Number.isInteger(listing.stock) && Number(listing.stock) >= 0 ? Number(listing.stock) : 0;
      const restoredStock = stock + currentOrder.items[index].quantity;
      tx.update(listingRefs[index], {
        stock: restoredStock,
        status: restoredStock > 0 ? 'Disponible' : listing.status,
        reservedQuantity: 0,
        reservedByOrderId: FieldValue.delete(),
        reservationExpiresAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    tx.update(paymentRef, { status: 'CANCELLED', cancelledAt: now, updatedAt: FieldValue.serverTimestamp() });
    tx.update(orderRef, { status: 'CANCELLED', cancelledAt: now, cancellationReason: 'INVENTORY_RESERVATION_EXPIRED', updatedAt: FieldValue.serverTimestamp() });
    return false;
  });

  if (!active) throw new Error('ORDER_RESERVATION_EXPIRED');
}

async function acquireCheckoutLease(paymentRef: FirebaseFirestore.DocumentReference, payment: PaymentTransaction): Promise<void> {
  const db = getDb();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  await db.runTransaction(async tx => {
    const snap = await tx.get(paymentRef);
    if (!snap.exists) throw new Error('PAYMENT_TRANSACTION_NOT_FOUND');
    const current = snap.data() as PaymentTransaction;
    if (current.status !== 'PAYMENT_PENDING') throw new Error('PAYMENT_NOT_PENDING');
    if (current.preferenceId && current.checkoutUrl) return;

    const startedAt = current.checkoutStartedAt ? Date.parse(current.checkoutStartedAt) : NaN;
    if (current.checkoutStatus === 'PROCESSING' && Number.isFinite(startedAt) && now - startedAt < CHECKOUT_LEASE_MS) {
      throw new Error('CHECKOUT_IN_PROGRESS');
    }

    tx.update(paymentRef, {
      checkoutStatus: 'PROCESSING',
      checkoutStartedAt: nowIso,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function persistCheckout(paymentRef: FirebaseFirestore.DocumentReference, payment: PaymentTransaction, checkout: { preferenceId: string; checkoutUrl: string }) {
  const db = getDb();
  return db.runTransaction(async tx => {
    const fresh = await tx.get(paymentRef);
    if (!fresh.exists) throw new Error('PAYMENT_TRANSACTION_NOT_FOUND');
    const current = fresh.data() as PaymentTransaction;
    if (current.status !== 'PAYMENT_PENDING') throw new Error('PAYMENT_NOT_PENDING');
    if (current.preferenceId && current.checkoutUrl) return { preferenceId: current.preferenceId, checkoutUrl: current.checkoutUrl };
    tx.update(paymentRef, {
      preferenceId: checkout.preferenceId,
      checkoutUrl: checkout.checkoutUrl,
      checkoutStatus: 'NONE',
      checkoutStartedAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return checkout;
  });
}

async function clearCheckoutLease(paymentRef: FirebaseFirestore.DocumentReference): Promise<void> {
  const db = getDb();
  await db.runTransaction(async tx => {
    const snap = await tx.get(paymentRef);
    if (!snap.exists) return;
    const current = snap.data() as PaymentTransaction;
    if (current.preferenceId && current.checkoutUrl) return;
    if (current.checkoutStatus !== 'PROCESSING') return;
    tx.update(paymentRef, {
      checkoutStatus: 'NONE',
      checkoutStartedAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function prepareNexoraCheckout(orderId: string, buyerId: string) {
  const db = getDb();
  const orderRef = db.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error('ORDER_NOT_FOUND');
  const order = { id: orderId, ...orderSnap.data() } as NexoraOrder;
  if (order.buyerId !== buyerId) throw new Error('FORBIDDEN');
  if (order.status !== 'PENDING') throw new Error('ORDER_NOT_PAYABLE');
  if (!order.paymentTransactionId) throw new Error('PAYMENT_TRANSACTION_MISSING');

  const paymentRef = db.collection('paymentTransactions').doc(order.paymentTransactionId);
  const paymentSnap = await paymentRef.get();
  if (!paymentSnap.exists) throw new Error('PAYMENT_TRANSACTION_NOT_FOUND');
  const payment = { id: paymentRef.id, ...paymentSnap.data() } as PaymentTransaction;
  if (payment.orderId !== orderId || payment.buyerId !== buyerId || payment.merchantId !== order.sellerId || payment.amountArs !== order.totalAmount) throw new Error('PAYMENT_ORDER_MISMATCH');
  if (payment.status !== 'PAYMENT_PENDING') throw new Error('PAYMENT_NOT_PENDING');

  await assertActiveReservation(orderId, order, payment);
  if (payment.preferenceId && payment.checkoutUrl) return { preferenceId: payment.preferenceId, checkoutUrl: payment.checkoutUrl, paymentTransactionId: payment.id };

  // Recover a preference that was created at Mercado Pago but not persisted locally.
  const existingCheckout = await findNexoraCheckout({ merchantId: payment.merchantId, paymentTransactionId: payment.id });
  if (existingCheckout) {
    const persisted = await persistCheckout(paymentRef, payment, existingCheckout);
    return { ...persisted, paymentTransactionId: payment.id };
  }

  await acquireCheckoutLease(paymentRef, payment);

  try {
    // Re-check after acquiring the lease so a concurrent creator can be recovered safely.
    const recoveredCheckout = await findNexoraCheckout({ merchantId: payment.merchantId, paymentTransactionId: payment.id });
    if (recoveredCheckout) {
      const persisted = await persistCheckout(paymentRef, payment, recoveredCheckout);
      return { ...persisted, paymentTransactionId: payment.id };
    }

    const checkout = await createNexoraCheckout({ merchantId: payment.merchantId, paymentTransactionId: payment.id, title: `Compra Nexora ${orderId}`, amountArs: payment.amountArs });
    const persisted = await persistCheckout(paymentRef, payment, checkout);
    return { ...persisted, paymentTransactionId: payment.id };
  } catch (error) {
    // If the provider rejected the creation request, release the lease. If the process
    // dies after provider acceptance, the next request recovers it via external_reference.
    await clearCheckoutLease(paymentRef).catch(() => undefined);
    throw error;
  }
}

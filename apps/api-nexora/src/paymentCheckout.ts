import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from './firebaseAdmin.js';
import { createNexoraCheckout } from './mercadoPago.js';
import type { Listing, NexoraOrder, PaymentTransaction } from '@super-app/shared-types';

async function assertActiveReservation(orderId: string, order: NexoraOrder, payment: PaymentTransaction): Promise<void> {
  const db = getDb();
  const orderRef = db.collection('orders').doc(orderId);
  const paymentRef = db.collection('paymentTransactions').doc(payment.id);
  const listingRefs = order.items.map(item => db.collection('listings').doc(item.listingId));
  const now = new Date().toISOString();

  await db.runTransaction(async tx => {
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
    const expired = listingSnaps.some((snap, index) => {
      if (!snap.exists) return true;
      const listing = snap.data() as Listing;
      return String(listing.reservedByOrderId || '') !== orderId || !listing.reservationExpiresAt || !Number.isFinite(Date.parse(listing.reservationExpiresAt)) || Date.parse(listing.reservationExpiresAt) <= nowMs || Number(listing.reservedQuantity) !== currentOrder.items[index].quantity;
    });
    if (!expired) return;

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
    throw new Error('ORDER_RESERVATION_EXPIRED');
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

  const checkout = await createNexoraCheckout({ merchantId: payment.merchantId, paymentTransactionId: payment.id, title: `Compra Nexora ${orderId}`, amountArs: payment.amountArs });
  await db.runTransaction(async tx => {
    const fresh = await tx.get(paymentRef);
    if (!fresh.exists) throw new Error('PAYMENT_TRANSACTION_NOT_FOUND');
    const current = fresh.data() as PaymentTransaction;
    if (current.status !== 'PAYMENT_PENDING') throw new Error('PAYMENT_NOT_PENDING');
    if (current.preferenceId && current.checkoutUrl) return;
    tx.update(paymentRef, { preferenceId: checkout.preferenceId, checkoutUrl: checkout.checkoutUrl, updatedAt: FieldValue.serverTimestamp() });
  });
  return { ...checkout, paymentTransactionId: payment.id };
}

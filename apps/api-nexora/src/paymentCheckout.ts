import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from './firebaseAdmin.js';
import { createNexoraCheckout } from './mercadoPago.js';
import type { NexoraOrder, PaymentTransaction } from '@super-app/shared-types';

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

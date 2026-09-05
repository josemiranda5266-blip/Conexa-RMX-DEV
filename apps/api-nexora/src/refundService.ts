import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from './firebaseAdmin.js';
import { requestMercadoPagoRefund } from './mercadoPago.js';
import type { NexoraOrder, PaymentTransaction } from '@super-app/shared-types';

export async function requestNexoraRefund(orderId: string, buyerId: string, reason: string) {
  const db = getDb();
  const orderRef = db.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error('ORDER_NOT_FOUND');
  const order = { id: orderId, ...orderSnap.data() } as NexoraOrder;
  if (order.buyerId !== buyerId) throw new Error('FORBIDDEN');
  if (order.status !== 'PAID') throw new Error('ORDER_NOT_REFUNDABLE');
  if (!order.paymentTransactionId) throw new Error('PAYMENT_TRANSACTION_MISSING');

  const paymentRef = db.collection('paymentTransactions').doc(order.paymentTransactionId);
  const prepared = await db.runTransaction(async tx => {
    const [freshOrder, freshPayment] = await Promise.all([tx.get(orderRef), tx.get(paymentRef)]);
    if (!freshOrder.exists) throw new Error('ORDER_NOT_FOUND');
    if (!freshPayment.exists) throw new Error('PAYMENT_TRANSACTION_NOT_FOUND');
    const currentOrder = freshOrder.data() as NexoraOrder;
    const payment = { id: paymentRef.id, ...freshPayment.data() } as PaymentTransaction;
    if (currentOrder.buyerId !== buyerId) throw new Error('FORBIDDEN');
    if (currentOrder.status !== 'PAID') throw new Error('ORDER_NOT_REFUNDABLE');
    if (payment.orderId !== orderId || payment.buyerId !== buyerId || payment.merchantId !== currentOrder.sellerId || payment.amountArs !== currentOrder.totalAmount) throw new Error('PAYMENT_ORDER_MISMATCH');
    if (payment.status === 'REFUNDED') throw new Error('ALREADY_REFUNDED');
    if (payment.status !== 'PAID') throw new Error('PAYMENT_NOT_REFUNDABLE');
    if (!payment.providerPaymentId) throw new Error('PROVIDER_PAYMENT_ID_MISSING');
    const now = new Date().toISOString();
    const refundStatus = String(payment.refundStatus || 'NONE');
    const refundAmount = Number(payment.refundAmountArs || payment.amountArs);
    if (!Number.isFinite(refundAmount) || refundAmount !== payment.amountArs) throw new Error('ONLY_FULL_REFUND_SUPPORTED');
    if (refundStatus === 'CONFIRMED') throw new Error('ALREADY_REFUNDED');
    tx.update(paymentRef, {
      refundStatus: 'PROCESSING',
      refundAmountArs: payment.amountArs,
      refundReason: reason.trim().slice(0, 500),
      refundRequestedAt: payment.refundRequestedAt || now,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { merchantId: payment.merchantId, providerPaymentId: payment.providerPaymentId, paymentTransactionId: payment.id, amountArs: payment.amountArs, idempotencyKey: `refund:${payment.id}` };
  });

  try {
    const provider = await requestMercadoPagoRefund({ merchantId: prepared.merchantId, paymentId: prepared.providerPaymentId, idempotencyKey: prepared.idempotencyKey });
    await paymentRef.update({ refundStatus: 'REQUESTED', refundProviderId: provider.providerRefundId, updatedAt: FieldValue.serverTimestamp() });
    return { accepted: true, paymentTransactionId: prepared.paymentTransactionId, providerRefundId: provider.providerRefundId };
  } catch (error) {
    await paymentRef.update({ refundStatus: 'FAILED', updatedAt: FieldValue.serverTimestamp() }).catch(() => undefined);
    throw error;
  }
}

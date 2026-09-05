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
    if (payment.status === 'CHARGEBACK') throw new Error('PAYMENT_CHARGEBACK_IN_PROGRESS');
    if (payment.status !== 'PAID') throw new Error('PAYMENT_NOT_REFUNDABLE');
    if (!payment.providerPaymentId) throw new Error('PROVIDER_PAYMENT_ID_MISSING');

    const refundStatus = String(payment.refundStatus || 'NONE').toUpperCase();
    if (refundStatus === 'CONFIRMED') throw new Error('ALREADY_REFUNDED');
    if (refundStatus === 'PROCESSING' || refundStatus === 'REQUESTED') throw new Error('REFUND_ALREADY_IN_PROGRESS');

    // A non-final chargeback blocks a new refund request. The chargeback must
    // reach a final provider outcome first so refund and chargeback cannot race
    // to create two independent financial reversals for the same payment.
    const chargebackQuery = await tx.get(
      db.collection('chargebackCases')
        .where('paymentTransactionId', '==', payment.id)
        .limit(20),
    );
    const chargebackInProgress = chargebackQuery.docs.some(doc => {
      const status = String(doc.data()?.status || '').toUpperCase();
      return status === 'OPENED' || status === 'UNDER_REVIEW' || status === 'EXPIRED';
    });
    if (chargebackInProgress) throw new Error('CHARGEBACK_IN_PROGRESS');

    const now = new Date().toISOString();
    const refundAmount = Number(payment.refundAmountArs || payment.amountArs);
    if (!Number.isFinite(refundAmount) || refundAmount !== payment.amountArs) throw new Error('ONLY_FULL_REFUND_SUPPORTED');
    tx.update(paymentRef, { refundStatus: 'PROCESSING', refundAmountArs: payment.amountArs, refundReason: reason.trim().slice(0, 500), refundRequestedAt: payment.refundRequestedAt || now, updatedAt: FieldValue.serverTimestamp() });
    return { merchantId: payment.merchantId, providerPaymentId: payment.providerPaymentId, paymentTransactionId: payment.id, amountArs: payment.amountArs, idempotencyKey: `refund:${payment.id}` };
  });

  try {
    const provider = await requestMercadoPagoRefund({ merchantId: prepared.merchantId, paymentId: prepared.providerPaymentId, idempotencyKey: prepared.idempotencyKey });
    await db.runTransaction(async tx => {
      const fresh = await tx.get(paymentRef);
      if (!fresh.exists) throw new Error('PAYMENT_TRANSACTION_NOT_FOUND');
      const current = fresh.data() || {};
      const currentStatus = String(current.status || '').toUpperCase();
      if (currentStatus === 'REFUNDED') {
        tx.update(paymentRef, {
          refundStatus: 'CONFIRMED',
          refundProviderId: provider.providerRefundId,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }
      if (currentStatus === 'CHARGEBACK') {
        // The provider accepted the refund request, but the financial state was
        // finalized as a chargeback concurrently. Do not mark it confirmed or
        // create a second reversal; the authoritative payment webhook decides
        // whether Mercado Pago actually completed a refund.
        tx.update(paymentRef, {
          refundStatus: 'FAILED',
          refundFailureReason: 'PAYMENT_FINANCIAL_STATE_CHANGED_TO_CHARGEBACK',
          refundProviderId: provider.providerRefundId,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }
      tx.update(paymentRef, {
        refundStatus: 'REQUESTED',
        refundProviderId: provider.providerRefundId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return { accepted: true, paymentTransactionId: prepared.paymentTransactionId, providerRefundId: provider.providerRefundId };
  } catch (error) {
    await db.runTransaction(async tx => {
      const fresh = await tx.get(paymentRef);
      if (!fresh.exists) return;
      const current = fresh.data() || {};
      if (String(current.status || '') !== 'REFUNDED') tx.update(paymentRef, { refundStatus: 'FAILED', updatedAt: FieldValue.serverTimestamp() });
    }).catch(() => undefined);
    throw error;
  }
}

import { getMercadoPagoOAuthConnection, decryptOAuthToken, type MercadoPagoOAuthConnection } from './payments/mercadoPagoOAuthTokenStore.js';

export type { MercadoPagoOAuthConnection } from './payments/mercadoPagoOAuthTokenStore.js';

export async function getNexoraMercadoPagoConnection(merchantId: string): Promise<MercadoPagoOAuthConnection> {
  return getMercadoPagoOAuthConnection(merchantId);
}

export async function createNexoraCheckout(input: { merchantId: string; paymentTransactionId: string; title: string; amountArs: number; clientEmail?: string }) {
  if (!Number.isFinite(input.amountArs) || input.amountArs <= 0) throw new Error('INVALID_PAYMENT_AMOUNT');
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) throw new Error('APP_URL_REQUIRED');
  const connection = await getMercadoPagoOAuthConnection(input.merchantId);
  const token = decryptOAuthToken(connection.encryptedAccessToken);
  const base = appUrl.replace(/\/$/, '');
  const notificationUrl = `${base}/api/mercadopago/webhook?transactionId=${encodeURIComponent(input.paymentTransactionId)}`;
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ id: input.paymentTransactionId, title: input.title, quantity: 1, currency_id: 'ARS', unit_price: input.amountArs }],
      payer: input.clientEmail ? { email: input.clientEmail } : undefined,
      external_reference: input.paymentTransactionId,
      back_urls: { success: `${base}/payment/success`, failure: `${base}/payment/failure`, pending: `${base}/payment/pending` },
      auto_return: 'approved',
      notification_url: notificationUrl,
    }),
  });
  if (!response.ok) throw new Error(`MP_CHECKOUT_${response.status}`);
  const data = await response.json() as any;
  if (!data.id || !data.init_point) throw new Error('MP_CHECKOUT_RESPONSE_INVALID');
  return { preferenceId: String(data.id), checkoutUrl: String(data.init_point) };
}

export async function requestMercadoPagoRefund(input: { merchantId: string; paymentId: string; amountArs?: number; idempotencyKey: string }) {
  if (!input.paymentId?.trim()) throw new Error('MP_PAYMENT_ID_REQUIRED');
  if (!input.idempotencyKey?.trim()) throw new Error('MP_IDEMPOTENCY_KEY_REQUIRED');
  if (input.amountArs !== undefined && (!Number.isFinite(input.amountArs) || input.amountArs <= 0)) throw new Error('INVALID_REFUND_AMOUNT');
  const connection = await getMercadoPagoOAuthConnection(input.merchantId);
  const token = decryptOAuthToken(connection.encryptedAccessToken);
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(input.paymentId)}/refunds`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': input.idempotencyKey },
    body: input.amountArs === undefined ? '{}' : JSON.stringify({ amount: input.amountArs }),
  });
  if (!response.ok) throw new Error(`MP_REFUND_${response.status}`);
  const data = await response.json().catch(() => ({})) as any;
  return { providerRefundId: data.id != null ? String(data.id) : undefined, status: data.status != null ? String(data.status) : undefined };
}

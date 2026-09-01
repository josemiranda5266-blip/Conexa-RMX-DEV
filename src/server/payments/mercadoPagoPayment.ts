import { MercadoPagoOAuthConnection, decryptOAuthToken } from './mercadoPagoOAuthTokenStore.js';
import { ensureMercadoPagoOAuthConnectionValid } from './mercadoPagoOAuth.js';

async function accessToken(connection: MercadoPagoOAuthConnection): Promise<{ token: string; connection: MercadoPagoOAuthConnection }> {
  const validConnection = await ensureMercadoPagoOAuthConnectionValid(connection);
  if (validConnection.provider !== 'MERCADO_PAGO') throw new Error('MERCADO_PAGO_CONNECTION_INVALID');
  return { token: decryptOAuthToken(validConnection.encryptedAccessToken), connection: validConnection };
}

export async function createMercadoPagoPreference(connection: MercadoPagoOAuthConnection, input: {
  transactionId: string;
  title: string;
  amountArs: number;
  clientEmail?: string;
  appUrl: string;
}) {
  if (!connection.merchantId) throw new Error('MERCADO_PAGO_MERCHANT_REQUIRED');
  if (!Number.isFinite(input.amountArs) || input.amountArs <= 0) throw new Error('INVALID_PAYMENT_AMOUNT');
  if (!input.transactionId?.trim()) throw new Error('TRANSACTION_ID_REQUIRED');
  const { token, connection: validConnection } = await accessToken(connection);
  const base = input.appUrl.replace(/\/$/, '');
  const webhookUrl = `${base}/api/mercadopago/webhook?merchantId=${encodeURIComponent(validConnection.merchantId)}`;
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ id: input.transactionId, title: input.title, quantity: 1, currency_id: 'ARS', unit_price: input.amountArs }],
      payer: input.clientEmail ? { email: input.clientEmail } : undefined,
      external_reference: input.transactionId,
      back_urls: { success: `${base}/payment/success`, failure: `${base}/payment/failure`, pending: `${base}/payment/pending` },
      auto_return: 'approved',
      notification_url: webhookUrl,
    }),
  });
  if (!response.ok) throw new Error(`MP_CHECKOUT_${response.status}`);
  const data = await response.json() as any;
  if (!data.id || !data.init_point) throw new Error('MP_CHECKOUT_RESPONSE_INVALID');
  return { preferenceId: String(data.id), checkoutUrl: String(data.init_point) };
}

export async function fetchMercadoPagoPaymentWithConnection(connection: MercadoPagoOAuthConnection, paymentId: string) {
  if (!paymentId?.trim()) throw new Error('MP_PAYMENT_ID_REQUIRED');
  const { token } = await accessToken(connection);
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`MP_PAYMENT_LOOKUP_${response.status}`);
  return response.json() as Promise<any>;
}

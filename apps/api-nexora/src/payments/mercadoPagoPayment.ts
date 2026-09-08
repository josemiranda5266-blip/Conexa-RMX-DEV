import { decryptOAuthToken, type MercadoPagoOAuthConnection } from './mercadoPagoOAuthTokenStore.js';

export async function fetchMercadoPagoPaymentWithConnection(connection: MercadoPagoOAuthConnection, paymentId: string) {
  if (!paymentId?.trim()) throw new Error('MP_PAYMENT_ID_REQUIRED');
  if (connection.revokedAt) throw new Error('MERCADO_PAGO_CONNECTION_REVOKED');
  const token = decryptOAuthToken(connection.encryptedAccessToken);
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`MP_PAYMENT_LOOKUP_${response.status}`);
  return response.json() as Promise<any>;
}

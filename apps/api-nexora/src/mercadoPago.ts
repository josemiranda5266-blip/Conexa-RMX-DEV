import crypto from 'crypto';
import { getDb } from './firebaseAdmin.js';

type EncryptedToken = { ciphertext: string; iv: string; authTag: string } | string;
type Connection = { merchantId: string; provider: 'MERCADO_PAGO'; encryptedAccessToken: EncryptedToken; encryptedRefreshToken?: EncryptedToken; expiresAt?: string; externalUserId?: string; revokedAt?: string };

function encryptionKey(): Buffer {
  const raw = process.env.MP_TOKEN_ENCRYPTION_KEY?.replace(/\s/g, '');
  if (!raw) throw new Error('MP_TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('MP_TOKEN_ENCRYPTION_KEY_INVALID');
  return key;
}
function decrypt(payload: EncryptedToken): string {
  if (typeof payload === 'string') {
    const [iv, tag, data] = payload.split('.');
    if (!iv || !tag || !data) throw new Error('OAUTH_TOKEN_PAYLOAD_INVALID');
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  }
  if (!payload?.ciphertext || !payload.iv || !payload.authTag) throw new Error('OAUTH_TOKEN_PAYLOAD_INVALID');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, 'base64')), decipher.final()]).toString('utf8');
}
async function connectionForMerchant(merchantId: string): Promise<Connection> {
  const snap = await getDb().collection('mercado_pago_connections').doc(merchantId).get();
  if (!snap.exists) throw new Error('MERCADO_PAGO_CONNECTION_NOT_FOUND');
  const data = snap.data() as any;
  const connection = { merchantId, provider: 'MERCADO_PAGO', encryptedAccessToken: data.encryptedAccessToken ?? data.accessTokenEnc, encryptedRefreshToken: data.encryptedRefreshToken ?? data.refreshTokenEnc, expiresAt: data.expiresAt, externalUserId: data.externalUserId ?? data.mpUserId, revokedAt: data.revokedAt } as Connection;
  if (!connection.encryptedAccessToken) throw new Error('MERCADO_PAGO_CONNECTION_INVALID');
  if (connection.revokedAt) throw new Error('MERCADO_PAGO_CONNECTION_REVOKED');
  return connection;
}
export async function createNexoraCheckout(input: { merchantId: string; paymentTransactionId: string; title: string; amountArs: number; clientEmail?: string }) {
  if (!Number.isFinite(input.amountArs) || input.amountArs <= 0) throw new Error('INVALID_PAYMENT_AMOUNT');
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) throw new Error('APP_URL_REQUIRED');
  const connection = await connectionForMerchant(input.merchantId);
  const token = decrypt(connection.encryptedAccessToken);
  const base = appUrl.replace(/\/$/, '');
  const notificationUrl = `${base}/api/mercadopago/webhook?transactionId=${encodeURIComponent(input.paymentTransactionId)}`;
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ id: input.paymentTransactionId, title: input.title, quantity: 1, currency_id: 'ARS', unit_price: input.amountArs }], payer: input.clientEmail ? { email: input.clientEmail } : undefined, external_reference: input.paymentTransactionId, back_urls: { success: `${base}/payment/success`, failure: `${base}/payment/failure`, pending: `${base}/payment/pending` }, auto_return: 'approved', notification_url: notificationUrl })
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
  const connection = await connectionForMerchant(input.merchantId);
  const token = decrypt(connection.encryptedAccessToken);
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(input.paymentId)}/refunds`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': input.idempotencyKey },
    body: input.amountArs === undefined ? '{}' : JSON.stringify({ amount: input.amountArs }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`MP_REFUND_${response.status}${detail ? `:${detail.slice(0, 300)}` : ''}`);
  }
  const data = await response.json().catch(() => ({})) as any;
  return { providerRefundId: data.id != null ? String(data.id) : undefined, status: data.status != null ? String(data.status) : undefined };
}

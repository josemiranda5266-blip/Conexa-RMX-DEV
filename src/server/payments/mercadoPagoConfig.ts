import crypto from 'crypto';

export type { EncryptedOAuthToken, MercadoPagoOAuthConnection } from './mercadoPagoOAuthTokenStore.js';
export { encryptOAuthToken, decryptOAuthToken } from './mercadoPagoOAuthTokenStore.js';

/** Validate Mercado Pago's x-signature manifest for a payment notification. */
export function verifyMercadoPagoWebhookSignature(
  signatureHeader: string | undefined,
  requestIdHeader: string | undefined,
  dataId: string | undefined,
): boolean {
  if (!signatureHeader || !requestIdHeader || !dataId) return false;
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error('MP_WEBHOOK_SECRET_NOT_CONFIGURED');

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, ...value] = part.trim().split('=');
      return [key, value.join('=')];
    }),
  );
  const timestamp = parts.ts;
  const receivedSignature = parts.v1;
  if (!timestamp || !receivedSignature || !/^[0-9a-f]+$/i.test(receivedSignature)) return false;

  const manifest = `id:${dataId};request-id:${requestIdHeader};ts:${timestamp};`;
  const expectedBuffer = crypto.createHmac('sha256', secret).update(manifest).digest();
  const received = Buffer.from(receivedSignature, 'hex');
  return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
}

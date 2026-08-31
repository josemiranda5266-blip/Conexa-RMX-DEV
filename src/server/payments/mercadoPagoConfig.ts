import crypto from 'crypto';

export function getMercadoPagoConfig() {
  const accessToken = process.env.MP_ACCESS_TOKEN?.trim();
  const webhookSecret = process.env.MP_WEBHOOK_SECRET?.trim();

  if (!accessToken) throw new Error('MP_ACCESS_TOKEN_NOT_CONFIGURED');
  if (!webhookSecret) throw new Error('MP_WEBHOOK_SECRET_NOT_CONFIGURED');

  return { accessToken, webhookSecret };
}

export function verifyMercadoPagoWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  requestIdHeader: string | undefined,
  dataId: string | undefined,
): boolean {
  if (!signatureHeader || !requestIdHeader || !dataId) return false;
  const { webhookSecret } = getMercadoPagoConfig();

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, ...value] = part.trim().split('=');
      return [key, value.join('=')];
    }),
  );

  const timestamp = parts.ts;
  const receivedSignature = parts.v1;
  if (!timestamp || !receivedSignature) return false;

  const manifest = `id:${dataId};request-id:${requestIdHeader};ts:${timestamp};`;
  const expected = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');
  const received = Buffer.from(receivedSignature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
}

export async function fetchMercadoPagoPayment(paymentId: string) {
  const { accessToken } = getMercadoPagoConfig();
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`MP_PAYMENT_LOOKUP_${response.status}`);
  return response.json() as Promise<any>;
}

import crypto from 'crypto';
import { encryptOAuthToken, MercadoPagoOAuthConnection } from './mercadoPagoOAuthTokenStore.js';

function requireOAuthConfig() {
  const appId = process.env.MP_APP_ID?.trim();
  const clientSecret = process.env.MP_CLIENT_SECRET?.trim();
  const stateSecret = process.env.MP_OAUTH_STATE_SECRET?.trim();
  const appUrl = process.env.APP_URL?.trim();
  if (!appId || !clientSecret || !stateSecret || !appUrl) throw new Error('MERCADO_PAGO_OAUTH_CONFIG_INCOMPLETE');
  return { appId, clientSecret, stateSecret, appUrl };
}

export function createOAuthState(merchantId: string, nonce = crypto.randomUUID()): string {
  const { stateSecret } = requireOAuthConfig();
  const payload = Buffer.from(JSON.stringify({ merchantId, nonce, iat: Date.now() }), 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', stateSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyOAuthState(state: string, merchantId: string): { valid: boolean; nonce?: string } {
  const { stateSecret } = requireOAuthConfig();
  const [payload, signature] = String(state || '').split('.');
  if (!payload || !signature) return { valid: false };
  const expected = crypto.createHmac('sha256', stateSecret).update(payload).digest('base64url');
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) return { valid: false };
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (parsed.merchantId !== merchantId || !parsed.nonce || !Number.isFinite(parsed.iat)) return { valid: false };
    if (Date.now() - parsed.iat < 0 || Date.now() - parsed.iat > 10 * 60 * 1000) return { valid: false };
    return { valid: true, nonce: String(parsed.nonce) };
  } catch { return { valid: false }; }
}

export function buildMercadoPagoAuthorizationUrl(merchantId: string): string {
  const { appId, appUrl } = requireOAuthConfig();
  const state = createOAuthState(merchantId);
  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/mercadopago/oauth/callback`;
  const params = new URLSearchParams({ client_id: appId, response_type: 'code', platform_id: 'mp', state, redirect_uri: redirectUri });
  return `https://auth.mercadopago.com/authorization?${params.toString()}`;
}

export async function exchangeMercadoPagoCode(code: string) {
  const { appId, clientSecret, appUrl } = requireOAuthConfig();
  if (!code?.trim()) throw new Error('MP_OAUTH_CODE_REQUIRED');
  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/mercadopago/oauth/callback`;
  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: appId, client_secret: clientSecret, grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
  });
  if (!response.ok) throw new Error(`MP_OAUTH_TOKEN_${response.status}`);
  const data = await response.json() as any;
  if (!data.access_token || !data.refresh_token || !data.user_id || !Number.isFinite(Number(data.expires_in))) throw new Error('MP_OAUTH_TOKEN_RESPONSE_INVALID');
  return {
    accessToken: encryptOAuthToken(String(data.access_token)),
    refreshToken: encryptOAuthToken(String(data.refresh_token)),
    userId: String(data.user_id),
    expiresAt: new Date(Date.now() + Number(data.expires_in) * 1000).toISOString(),
  };
}

export function createOAuthConnection(merchantId: string, token: Awaited<ReturnType<typeof exchangeMercadoPagoCode>>): MercadoPagoOAuthConnection {
  return { merchantId, provider: 'MERCADO_PAGO', encryptedAccessToken: token.accessToken, encryptedRefreshToken: token.refreshToken, expiresAt: token.expiresAt, externalUserId: token.userId, connectedAt: new Date().toISOString() };
}

import crypto from 'crypto';
import { decryptOAuthToken, encryptOAuthToken, getMercadoPagoOAuthConnection, type MercadoPagoOAuthConnection } from './mercadoPagoOAuthTokenStore.js';
import { consumeOAuthState, reserveOAuthState, saveOAuthConnection } from './mercadoPagoOAuthPersistence.js';

const REFRESH_SKEW_MS = 5 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function requireOAuthConfig() {
  const appId = process.env.MP_APP_ID?.trim();
  const clientSecret = process.env.MP_CLIENT_SECRET?.trim();
  const stateSecret = process.env.MP_OAUTH_STATE_SECRET?.trim();
  const appUrl = process.env.APP_URL?.trim();
  if (!appId || !clientSecret || !stateSecret || !appUrl) throw new Error('MERCADO_PAGO_OAUTH_CONFIG_INCOMPLETE');
  return { appId, clientSecret, stateSecret, appUrl };
}

export async function buildMercadoPagoAuthorizationUrl(merchantId: string): Promise<string> {
  const { appId, appUrl, stateSecret } = requireOAuthConfig();
  const normalizedMerchantId = merchantId.trim();
  if (!normalizedMerchantId) throw new Error('MERCADO_PAGO_MERCHANT_REQUIRED');
  const nonce = crypto.randomUUID();
  const payload = Buffer.from(JSON.stringify({ merchantId: normalizedMerchantId, nonce, iat: Date.now() }), 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', stateSecret).update(payload).digest('base64url');
  await reserveOAuthState(normalizedMerchantId, nonce, new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString());
  const state = `${payload}.${signature}`;
  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/mercadopago/oauth/callback`;
  const params = new URLSearchParams({ client_id: appId, response_type: 'code', platform_id: 'mp', scope: 'offline_access write read', state, redirect_uri: redirectUri });
  return `https://auth.mercadopago.com/authorization?${params.toString()}`;
}

export async function consumeAndValidateOAuthState(state: string): Promise<string> {
  const { stateSecret } = requireOAuthConfig();
  const [payload, signature] = String(state || '').split('.');
  if (!payload || !signature) throw new Error('OAUTH_STATE_INVALID');
  const expected = crypto.createHmac('sha256', stateSecret).update(payload).digest('base64url');
  const received = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (received.length !== expectedBuffer.length || !crypto.timingSafeEqual(received, expectedBuffer)) throw new Error('OAUTH_STATE_INVALID');
  let parsed: any;
  try { parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { throw new Error('OAUTH_STATE_INVALID'); }
  const merchantId = String(parsed?.merchantId || '').trim();
  const nonce = String(parsed?.nonce || '').trim();
  const issuedAt = Number(parsed?.iat);
  if (!merchantId || !nonce || !Number.isFinite(issuedAt) || Date.now() - issuedAt < 0 || Date.now() - issuedAt > OAUTH_STATE_TTL_MS) throw new Error('OAUTH_STATE_EXPIRED');
  await consumeOAuthState(merchantId, nonce);
  return merchantId;
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

export async function saveMercadoPagoOAuthCodeExchange(merchantId: string, token: Awaited<ReturnType<typeof exchangeMercadoPagoCode>>) {
  const connection: MercadoPagoOAuthConnection = {
    merchantId,
    provider: 'MERCADO_PAGO',
    encryptedAccessToken: token.accessToken,
    encryptedRefreshToken: token.refreshToken,
    expiresAt: token.expiresAt,
    externalUserId: token.userId,
    connectedAt: new Date().toISOString(),
  };
  await saveOAuthConnection(connection);
  return connection;
}

export async function refreshMercadoPagoOAuthConnection(connection: MercadoPagoOAuthConnection): Promise<MercadoPagoOAuthConnection> {
  const { appId, clientSecret } = requireOAuthConfig();
  if (!connection.encryptedRefreshToken) throw new Error('MERCADO_PAGO_REFRESH_TOKEN_MISSING');
  const refreshToken = decryptOAuthToken(connection.encryptedRefreshToken);
  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: appId, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  if (!response.ok) throw new Error(`MERCADO_PAGO_OAUTH_REFRESH_${response.status}`);
  const data = await response.json() as any;
  if (!data.access_token || !data.refresh_token || !Number.isFinite(Number(data.expires_in))) throw new Error('MERCADO_PAGO_OAUTH_REFRESH_RESPONSE_INVALID');
  const refreshed: MercadoPagoOAuthConnection = {
    ...connection,
    encryptedAccessToken: encryptOAuthToken(String(data.access_token)),
    encryptedRefreshToken: encryptOAuthToken(String(data.refresh_token)),
    expiresAt: new Date(Date.now() + Number(data.expires_in) * 1000).toISOString(),
    externalUserId: data.user_id != null ? String(data.user_id) : connection.externalUserId,
    revokedAt: undefined,
  };
  await saveOAuthConnection(refreshed);
  return refreshed;
}

export async function getValidMercadoPagoOAuthConnection(merchantId: string): Promise<MercadoPagoOAuthConnection> {
  const connection = await getMercadoPagoOAuthConnection(merchantId);
  if (!connection.expiresAt) return connection;
  const expiresAt = Date.parse(connection.expiresAt);
  if (!Number.isFinite(expiresAt)) throw new Error('MERCADO_PAGO_EXPIRES_AT_INVALID');
  if (expiresAt - Date.now() > REFRESH_SKEW_MS) return connection;
  return refreshMercadoPagoOAuthConnection(connection);
}

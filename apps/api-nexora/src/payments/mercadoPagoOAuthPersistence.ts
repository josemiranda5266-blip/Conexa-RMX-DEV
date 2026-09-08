import { getDb } from '../firebaseAdmin.js';
import { normalizeMercadoPagoOAuthConnection, type MercadoPagoOAuthConnection } from './mercadoPagoOAuthTokenStore.js';

const CONNECTION_COLLECTION = 'mercado_pago_connections';
const STATE_COLLECTION = 'mercado_pago_oauth_states';

export async function reserveOAuthState(merchantId: string, nonce: string, expiresAt: string): Promise<void> {
  const normalizedMerchantId = merchantId.trim();
  if (!normalizedMerchantId || !nonce) throw new Error('MERCADO_PAGO_MERCHANT_REQUIRED');
  const ref = getDb().collection(STATE_COLLECTION).doc(nonce);
  await getDb().runTransaction(async tx => {
    const existing = await tx.get(ref);
    if (existing.exists) throw new Error('OAUTH_STATE_NONCE_ALREADY_RESERVED');
    tx.create(ref, { merchantId: normalizedMerchantId, expiresAt, createdAt: new Date().toISOString() });
  });
}

export async function consumeOAuthState(merchantId: string, nonce: string): Promise<void> {
  const ref = getDb().collection(STATE_COLLECTION).doc(nonce);
  await getDb().runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('OAUTH_STATE_NOT_FOUND');
    const data = snap.data() || {};
    if (data.merchantId !== merchantId) throw new Error('OAUTH_STATE_MERCHANT_MISMATCH');
    if (!data.expiresAt || Date.parse(String(data.expiresAt)) <= Date.now()) throw new Error('OAUTH_STATE_EXPIRED');
    tx.delete(ref);
  });
}

export async function saveOAuthConnection(connection: MercadoPagoOAuthConnection): Promise<void> {
  await getDb().collection(CONNECTION_COLLECTION).doc(connection.merchantId).set(connection, { merge: true });
}

export async function getOAuthConnection(merchantId: string): Promise<MercadoPagoOAuthConnection | null> {
  const normalizedMerchantId = merchantId.trim();
  if (!normalizedMerchantId) return null;
  const ref = getDb().collection(CONNECTION_COLLECTION).doc(normalizedMerchantId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const connection = normalizeMercadoPagoOAuthConnection(snap.data(), normalizedMerchantId);
  if (!connection) return null;
  const data = snap.data() || {};
  if (data.encryptedAccessToken === undefined || data.accessTokenEnc !== undefined || data.encryptedRefreshToken === undefined && data.refreshTokenEnc !== undefined) {
    await ref.set(connection, { merge: true });
  }
  return connection;
}

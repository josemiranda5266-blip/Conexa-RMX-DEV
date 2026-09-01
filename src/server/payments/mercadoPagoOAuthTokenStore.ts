import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function encryptionKey(): Buffer {
  const raw = process.env.MP_TOKEN_ENCRYPTION_KEY?.replace(/\s/g, '');
  if (!raw) throw new Error('MP_TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('MP_TOKEN_ENCRYPTION_KEY_INVALID');
  return key;
}

export interface EncryptedOAuthToken { ciphertext: string; iv: string; authTag: string; }

export interface MercadoPagoOAuthConnection {
  merchantId: string;
  provider: 'MERCADO_PAGO';
  encryptedAccessToken: EncryptedOAuthToken | string;
  encryptedRefreshToken?: EncryptedOAuthToken | string;
  expiresAt?: string;
  externalUserId?: string;
  connectedAt: string;
  revokedAt?: string;
}

export function encryptOAuthToken(token: string): EncryptedOAuthToken {
  if (!token) throw new Error('OAUTH_TOKEN_EMPTY');
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), authTag: cipher.getAuthTag().subarray(0, TAG_BYTES).toString('base64') };
}

export function decryptOAuthToken(payload: EncryptedOAuthToken | string): string {
  if (typeof payload === 'string') {
    const [ivB64, tagB64, dataB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !dataB64) throw new Error('OAUTH_TOKEN_PAYLOAD_INVALID');
    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  if (!payload?.ciphertext || !payload?.iv || !payload?.authTag) throw new Error('OAUTH_TOKEN_PAYLOAD_INVALID');
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

/**
 * Converts the legacy Firestore connection shape to the unified contract while
 * preserving the legacy encrypted token string. This allows a controlled
 * migration without forcing existing merchants to reconnect Mercado Pago.
 */
export function normalizeMercadoPagoOAuthConnection(data: any, fallbackMerchantId?: string): MercadoPagoOAuthConnection | null {
  if (!data) return null;
  const merchantId = String(data.merchantId || data.userId || fallbackMerchantId || '').trim();
  if (!merchantId) return null;

  const access = data.encryptedAccessToken ?? data.accessTokenEnc;
  if (!access) return null;

  return {
    merchantId,
    provider: 'MERCADO_PAGO',
    encryptedAccessToken: access,
    encryptedRefreshToken: data.encryptedRefreshToken ?? data.refreshTokenEnc,
    expiresAt: data.expiresAt,
    externalUserId: data.externalUserId || data.mpUserId || undefined,
    connectedAt: data.connectedAt || data.tokenCreatedAt || new Date().toISOString(),
    revokedAt: data.revokedAt || (data.connected === false ? new Date(0).toISOString() : undefined),
  };
}

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

export interface EncryptedOAuthToken {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export interface MercadoPagoOAuthConnection {
  merchantId: string;
  provider: 'MERCADO_PAGO';
  encryptedAccessToken: EncryptedOAuthToken;
  encryptedRefreshToken?: EncryptedOAuthToken;
  expiresAt?: string;
  externalUserId?: string;
  connectedAt: string;
  revokedAt?: string;
}

export function encryptOAuthToken(token: string): EncryptedOAuthToken {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().subarray(0, TAG_BYTES).toString('base64'),
  };
}

export function decryptOAuthToken(payload: EncryptedOAuthToken): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

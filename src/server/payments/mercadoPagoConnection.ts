import { MercadoPagoOAuthConnection, decryptOAuthToken } from './mercadoPagoConfig';

export interface MercadoPagoConnectionDocument extends MercadoPagoOAuthConnection {
  encryptedAccessToken: { ciphertext: string; iv: string; authTag: string };
  encryptedRefreshToken?: { ciphertext: string; iv: string; authTag: string };
}

export function getAccessToken(connection: MercadoPagoConnectionDocument): string {
  if (connection.provider !== 'MERCADO_PAGO' || connection.revokedAt) {
    throw new Error('MERCADO_PAGO_CONNECTION_INVALID');
  }
  if (connection.expiresAt && Date.parse(connection.expiresAt) <= Date.now()) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN_EXPIRED');
  }
  return decryptOAuthToken(connection.encryptedAccessToken);
}

export function buildPaymentHeaders(connection: MercadoPagoConnectionDocument) {
  return {
    Authorization: `Bearer ${getAccessToken(connection)}`,
    'Content-Type': 'application/json',
  };
}

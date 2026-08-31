import { MercadoPagoOAuthConnection, decryptOAuthToken } from './mercadoPagoOAuthTokenStore.js';

export interface MercadoPagoConnectionDocument extends MercadoPagoOAuthConnection {}

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

import { Request, Response } from 'express';
import { getAdminDb } from '../firebaseAdmin.js';
import { verifyMercadoPagoWebhookSignature } from './mercadoPagoConfig.js';
import { reconcileMercadoPagoPayment } from './mercadoPagoReconciliation.js';
import { MercadoPagoOAuthConnection, normalizeMercadoPagoOAuthConnection } from './mercadoPagoOAuthTokenStore.js';

const CONNECTION_COLLECTION = 'mercado_pago_connections';
const TRANSACTION_COLLECTION = 'transactions';

function notificationDataId(req: Request): string | undefined {
  const body = req.body as any;
  const query = req.query as any;
  return body?.data?.id != null
    ? String(body.data.id)
    : query?.['data.id'] != null
      ? String(query['data.id'])
      : undefined;
}

function requestId(req: Request): string | undefined {
  return req.header('x-request-id') || undefined;
}

function signature(req: Request): string | undefined {
  return req.header('x-signature') || undefined;
}

async function connectionForMerchant(merchantId: string): Promise<MercadoPagoOAuthConnection | null> {
  const snapshot = await getAdminDb().collection(CONNECTION_COLLECTION).doc(merchantId).get();
  if (!snapshot.exists) return null;
  return normalizeMercadoPagoOAuthConnection(snapshot.data(), merchantId);
}

async function merchantIdForTransaction(transactionId: string): Promise<string | null> {
  if (!transactionId?.trim()) return null;
  const snapshot = await getAdminDb().collection(TRANSACTION_COLLECTION).doc(transactionId).get();
  if (!snapshot.exists) return null;
  const professionalId = snapshot.data()?.professionalId;
  return professionalId == null ? null : String(professionalId).trim() || null;
}

export async function handleMercadoPagoWebhook(req: Request, res: Response): Promise<Response> {
  try {
    const dataId = notificationDataId(req);
    if (!dataId) return res.status(400).json({ success: false, code: 'PAYMENT_ID_REQUIRED' });

    // Checkout Pro currently sends transactionId in notification_url. Resolve the
    // merchant from the server-owned transaction instead of trusting a merchantId
    // query parameter supplied by the notification sender.
    const hintedTransactionId = typeof req.query.transactionId === 'string'
      ? req.query.transactionId.trim()
      : '';
    const merchantId = hintedTransactionId
      ? await merchantIdForTransaction(hintedTransactionId)
      : null;

    if (!merchantId) return res.status(400).json({ success: false, code: 'TRANSACTION_REFERENCE_REQUIRED' });

    if (!verifyMercadoPagoWebhookSignature(signature(req), requestId(req), dataId)) {
      return res.status(401).json({ success: false, code: 'WEBHOOK_SIGNATURE_INVALID' });
    }

    const connection = await connectionForMerchant(merchantId);
    if (!connection) return res.status(404).json({ success: false, code: 'MERCADO_PAGO_CONNECTION_NOT_FOUND' });
    if (String(connection.merchantId) !== merchantId) {
      return res.status(403).json({ success: false, code: 'MERCADO_PAGO_CONNECTION_MISMATCH' });
    }

    const result = await reconcileMercadoPagoPayment(dataId, connection);
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error('[MERCADO PAGO WEBHOOK]', error?.message || error);
    return res.status(500).json({ success: false, code: 'WEBHOOK_PROCESSING_ERROR' });
  }
}

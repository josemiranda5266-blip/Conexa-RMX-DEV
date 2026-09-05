import { Request, Response } from 'express';
import { getAdminDb } from '../firebaseAdmin.js';
import { verifyMercadoPagoWebhookSignature } from './mercadoPagoConfig.js';
import { reconcileMercadoPagoPayment } from './mercadoPagoReconciliation.js';
import { MercadoPagoOAuthConnection, decryptOAuthToken, normalizeMercadoPagoOAuthConnection } from './mercadoPagoOAuthTokenStore.js';
import { startChargebackExpiryWorker } from './chargebackExpiry.js';
import { getChargebackFromMP } from '@super-app/shared-payments';
import { openOrUpdateChargebackCase, resolveChargebackCase } from './chargebackResolutionService.js';

const CONNECTION_COLLECTION = 'mercado_pago_connections';
startChargebackExpiryWorker();

function resourceId(req: Request): string | undefined {
  const body = req.body as any;
  const query = req.query as any;
  return query?.['data.id'] != null ? String(query['data.id']).trim() || undefined : body?.data?.id != null ? String(body.data.id).trim() || undefined : undefined;
}
function eventType(req: Request): string {
  const body = req.body as any;
  const query = req.query as any;
  return String(body?.type || body?.topic || body?.action || query?.type || query?.topic || '').trim().toLowerCase();
}
function isChargebackEvent(req: Request): boolean { return eventType(req).includes('chargeback'); }
function paymentId(req: Request): string | undefined {
  const body = req.body as any;
  const query = req.query as any;
  if (isChargebackEvent(req)) {
    const id = body?.data?.payment_id ?? body?.payment_id ?? query?.payment_id;
    if (id != null) return String(id).trim() || undefined;
  }
  return resourceId(req);
}
function requestId(req: Request): string | undefined { return req.header('x-request-id') || undefined; }
function signature(req: Request): string | undefined { return req.header('x-signature') || undefined; }
async function connectionForMerchant(merchantId: string): Promise<MercadoPagoOAuthConnection | null> {
  const snapshot = await getAdminDb().collection(CONNECTION_COLLECTION).doc(merchantId).get();
  return snapshot.exists ? normalizeMercadoPagoOAuthConnection(snapshot.data(), merchantId) : null;
}
async function merchantIdForTransaction(transactionId: string): Promise<string | null> {
  if (!transactionId?.trim()) return null;
  const db = getAdminDb();
  const [conexa, nexora] = await Promise.all([db.collection('transactions').doc(transactionId).get(), db.collection('paymentTransactions').doc(transactionId).get()]);
  if (conexa.exists) { const id = conexa.data()?.professionalId; return id == null ? null : String(id).trim() || null; }
  if (nexora.exists) { const id = nexora.data()?.merchantId; return id == null ? null : String(id).trim() || null; }
  return null;
}
async function merchantIdForProviderPayment(providerPaymentId: string): Promise<string | null> {
  const db = getAdminDb();
  const [nexora, conexa] = await Promise.all([
    db.collection('paymentTransactions').where('providerPaymentId', '==', String(providerPaymentId)).limit(1).get(),
    db.collection('transactions').where('mercadoPagoPaymentId', '==', String(providerPaymentId)).limit(1).get(),
  ]);
  if (!nexora.empty) return String(nexora.docs[0].data()?.merchantId || '').trim() || null;
  if (!conexa.empty) return String(conexa.docs[0].data()?.professionalId || '').trim() || null;
  return null;
}

export async function handleMercadoPagoWebhook(req: Request, res: Response): Promise<Response> {
  try {
    const signedResourceId = resourceId(req);
    if (!signedResourceId) return res.status(400).json({ success: false, code: 'RESOURCE_ID_REQUIRED' });

    if (isChargebackEvent(req)) {
      const providerPaymentId = paymentId(req);
      if (!providerPaymentId) return res.status(400).json({ success: false, code: 'PAYMENT_ID_REQUIRED' });
      // For chargebacks the signed resource is data.id = chargeback case ID, never payment_id.
      if (!verifyMercadoPagoWebhookSignature(signature(req), requestId(req), signedResourceId)) return res.status(401).json({ success: false, code: 'WEBHOOK_SIGNATURE_INVALID' });

      const hintedTransactionId = typeof req.query.transactionId === 'string' ? req.query.transactionId.trim() : '';
      const merchantId = hintedTransactionId ? await merchantIdForTransaction(hintedTransactionId) : await merchantIdForProviderPayment(providerPaymentId);
      if (!merchantId) return res.status(400).json({ success: false, code: 'TRANSACTION_REFERENCE_REQUIRED' });
      const connection = await connectionForMerchant(merchantId);
      if (!connection) return res.status(404).json({ success: false, code: 'MERCADO_PAGO_CONNECTION_NOT_FOUND' });
      if (String(connection.merchantId) !== merchantId) return res.status(403).json({ success: false, code: 'MERCADO_PAGO_CONNECTION_MISMATCH' });

      const accessToken = decryptOAuthToken(connection.encryptedAccessToken);
      const chargeback = await getChargebackFromMP(signedResourceId, accessToken);
      if (chargeback.paymentId && String(chargeback.paymentId) !== String(providerPaymentId)) return res.status(400).json({ success: false, code: 'CHARGEBACK_PAYMENT_MISMATCH' });

      const db = getAdminDb();
      const paymentSnapshot = await db.collection('paymentTransactions').where('providerPaymentId', '==', String(providerPaymentId)).limit(1).get();
      if (paymentSnapshot.empty) return res.status(404).json({ success: false, code: 'PAYMENT_TRANSACTION_NOT_FOUND' });
      const paymentTransactionId = paymentSnapshot.docs[0].id;
      await openOrUpdateChargebackCase({ chargeback, paymentTransactionId, merchantId, webhookAction: eventType(req) || 'chargeback', receivedAt: new Date().toISOString() });

      if (chargeback.coverageApplied === true || chargeback.coverageApplied === false) {
        const resolution = chargeback.coverageApplied ? 'Mercado Pago resolvió el chargeback a favor del comercio.' : 'Mercado Pago resolvió el chargeback en contra del comercio.';
        const result = await resolveChargebackCase(signedResourceId, chargeback.coverageApplied, resolution);
        return res.status(200).json({ success: true, chargebackId: signedResourceId, ...result });
      }
      return res.status(200).json({ success: true, chargebackId: signedResourceId, status: 'UNDER_REVIEW' });
    }

    const providerPaymentId = paymentId(req);
    if (!providerPaymentId) return res.status(400).json({ success: false, code: 'PAYMENT_ID_REQUIRED' });
    if (!verifyMercadoPagoWebhookSignature(signature(req), requestId(req), signedResourceId)) return res.status(401).json({ success: false, code: 'WEBHOOK_SIGNATURE_INVALID' });

    const hintedTransactionId = typeof req.query.transactionId === 'string' ? req.query.transactionId.trim() : '';
    const merchantId = hintedTransactionId ? await merchantIdForTransaction(hintedTransactionId) : await merchantIdForProviderPayment(providerPaymentId);
    if (!merchantId) return res.status(400).json({ success: false, code: 'TRANSACTION_REFERENCE_REQUIRED' });
    const connection = await connectionForMerchant(merchantId);
    if (!connection) return res.status(404).json({ success: false, code: 'MERCADO_PAGO_CONNECTION_NOT_FOUND' });
    if (String(connection.merchantId) !== merchantId) return res.status(403).json({ success: false, code: 'MERCADO_PAGO_CONNECTION_MISMATCH' });

    const result = await reconcileMercadoPagoPayment(providerPaymentId, connection);
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error('[MERCADO PAGO WEBHOOK]', error?.message || error);
    return res.status(500).json({ success: false, code: 'WEBHOOK_PROCESSING_ERROR' });
  }
}

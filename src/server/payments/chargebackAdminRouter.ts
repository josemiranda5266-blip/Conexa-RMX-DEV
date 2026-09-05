import { Router, type Request, type Response } from 'express';
import { getAdminDb } from '../firebaseAdmin.js';
import { verifyAuthToken } from '../auth.js';
import { decryptOAuthToken } from './mercadoPagoOAuthTokenStore.js';
import { submitEvidenceToMP, type MPChargebackEvidenceFile } from '@super-app/shared-payments';

export const chargebackAdminRouter = Router();

async function requireAdmin(req: Request, res: Response): Promise<string | null> {
  const auth = await verifyAuthToken(req);
  if (!auth.isAuthenticated || !auth.userId) { res.status(401).json({ error: 'UNAUTHORIZED' }); return null; }
  if (!auth.isAdmin) { res.status(403).json({ error: 'ADMIN_REQUIRED' }); return null; }
  return auth.userId;
}

chargebackAdminRouter.get('/api/admin/chargebacks', async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const snap = await getAdminDb().collection('chargebackCases').orderBy('updatedAt', 'desc').limit(limit).get();
    return res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error: any) {
    return res.status(500).json({ error: 'CHARGEBACK_LIST_FAILED', detail: error?.message || 'unknown' });
  }
});

chargebackAdminRouter.get('/api/admin/chargebacks/:id', async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'CHARGEBACK_ID_REQUIRED' });
  try {
    const snap = await getAdminDb().collection('chargebackCases').doc(id).get();
    return snap.exists ? res.json({ id: snap.id, ...snap.data() }) : res.status(404).json({ error: 'CHARGEBACK_CASE_NOT_FOUND' });
  } catch { return res.status(500).json({ error: 'CHARGEBACK_DETAIL_FAILED' }); }
});

function decodeEvidenceFiles(body: any): MPChargebackEvidenceFile[] {
  const files = Array.isArray(body?.files) ? body.files : [];
  return files.map((file: any) => ({
    filename: typeof file.filename === 'string' ? file.filename : '',
    mimeType: file.mimeType,
    content: typeof file.contentBase64 === 'string' ? Buffer.from(file.contentBase64, 'base64') : new Uint8Array(),
  }));
}

chargebackAdminRouter.post('/api/admin/chargebacks/:id/evidence', async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  const id = String(req.params.id || '').trim();
  const normalized = decodeEvidenceFiles(req.body);
  if (!id || normalized.length < 1 || normalized.length > 10) return res.status(400).json({ error: 'INVALID_EVIDENCE' });
  if (normalized.some(file => !file.filename || file.content.byteLength === 0)) return res.status(400).json({ error: 'INVALID_EVIDENCE_FILE' });
  const totalBytes = normalized.reduce((sum, file) => sum + file.content.byteLength, 0);
  if (totalBytes > 10 * 1024 * 1024) return res.status(413).json({ error: 'EVIDENCE_TOTAL_SIZE_EXCEEDED' });
  try {
    const db = getAdminDb();
    const ref = db.collection('chargebackCases').doc(id);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('CHARGEBACK_CASE_NOT_FOUND');
      const current = snap.data() || {};
      const existing = Array.isArray(current.evidence) ? current.evidence : [];
      const metadata = normalized.map(file => ({ filename: file.filename, mimeType: file.mimeType, size: file.content.byteLength, uploadedAt: new Date().toISOString() }));
      tx.update(ref, { evidence: [...existing, ...metadata], updatedAt: new Date().toISOString() });
    });
    return res.status(201).json({ success: true, files: normalized.map(file => ({ filename: file.filename, mimeType: file.mimeType, size: file.content.byteLength })) });
  } catch (error: any) {
    return res.status(error?.message === 'CHARGEBACK_CASE_NOT_FOUND' ? 404 : 500).json({ error: error?.message || 'EVIDENCE_SAVE_FAILED' });
  }
});

chargebackAdminRouter.post('/api/admin/chargebacks/:id/submit-evidence', async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'CHARGEBACK_ID_REQUIRED' });
  try {
    const db = getAdminDb();
    const caseSnap = await db.collection('chargebackCases').doc(id).get();
    if (!caseSnap.exists) return res.status(404).json({ error: 'CHARGEBACK_CASE_NOT_FOUND' });
    const chargeback = caseSnap.data() || {};
    const merchantId = String(chargeback.merchantId || '').trim();
    if (!merchantId) return res.status(409).json({ error: 'CHARGEBACK_PROVIDER_REFERENCE_MISSING' });
    const connectionSnap = await db.collection('mercado_pago_connections').doc(merchantId).get();
    if (!connectionSnap.exists) return res.status(404).json({ error: 'MERCADO_PAGO_CONNECTION_NOT_FOUND' });
    const connection = connectionSnap.data() || {};
    const encrypted = connection.encryptedAccessToken ?? connection.accessTokenEnc;
    if (!encrypted) return res.status(409).json({ error: 'MERCADO_PAGO_CONNECTION_INVALID' });
    const evidence = decodeEvidenceFiles(req.body);
    if (evidence.length < 1 || evidence.length > 10) return res.status(400).json({ error: 'INVALID_EVIDENCE' });
    const totalBytes = evidence.reduce((sum, file) => sum + file.content.byteLength, 0);
    if (totalBytes > 10 * 1024 * 1024) return res.status(413).json({ error: 'EVIDENCE_TOTAL_SIZE_EXCEEDED' });
    const result = await submitEvidenceToMP(id, evidence, decryptOAuthToken(encrypted), `chargeback-evidence:${id}:${Date.now()}`, connection.externalUserId || connection.mpUserId);
    await db.collection('chargebackCases').doc(id).set({ status: 'UNDER_REVIEW', evidenceSubmittedAt: new Date().toISOString(), evidenceProviderResponse: result, updatedAt: new Date().toISOString() }, { merge: true });
    return res.json({ success: true, provider: result });
  } catch (error: any) {
    return res.status(502).json({ error: 'CHARGEBACK_EVIDENCE_SUBMIT_FAILED', detail: error?.message || 'unknown' });
  }
});

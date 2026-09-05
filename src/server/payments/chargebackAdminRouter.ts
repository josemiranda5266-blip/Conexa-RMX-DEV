import express, { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { getAdminDb } from '../firebaseAdmin.js';
import { verifyAuthToken } from '../auth.js';
import { decryptOAuthToken } from './mercadoPagoOAuthTokenStore.js';
import { submitEvidenceToMP, type MPChargebackEvidenceFile } from '@super-app/shared-payments';

export const chargebackAdminRouter = Router();
// Base64 expands binary payloads by roughly one third, so allow enough JSON
// envelope space for the documented 10 MB aggregate evidence limit. The parser
// is attached only to evidence POST routes; normal admin/API requests retain the
// default 1 MB body limit.
const evidenceJsonParser = express.json({ limit: '15mb' });
const MAX_EVIDENCE_FILES = 10;
const MAX_TOTAL_EVIDENCE_BYTES = 10 * 1024 * 1024;
const MAX_SINGLE_EVIDENCE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EVIDENCE_MIME_TYPES = new Set<MPChargebackEvidenceFile['mimeType']>([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

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

function sanitizeFilename(value: unknown): string {
  if (typeof value !== 'string') return '';
  const basename = value.replace(/\\/g, '/').split('/').pop() || '';
  return basename
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+$/, '')
    .slice(0, 180);
}

function decodeEvidenceFiles(body: any): MPChargebackEvidenceFile[] {
  const files = Array.isArray(body?.files) ? body.files : [];
  return files.map((file: any) => ({
    filename: sanitizeFilename(file?.filename),
    mimeType: file?.mimeType,
    content: typeof file?.contentBase64 === 'string' ? Buffer.from(file.contentBase64, 'base64') : new Uint8Array(),
  }));
}

function validateEvidence(evidence: MPChargebackEvidenceFile[]): string | null {
  if (evidence.length < 1 || evidence.length > MAX_EVIDENCE_FILES) return 'INVALID_EVIDENCE';
  for (const file of evidence) {
    if (!file.filename || file.filename === '.' || file.filename === '..') return 'INVALID_EVIDENCE_FILENAME';
    if (!ALLOWED_EVIDENCE_MIME_TYPES.has(file.mimeType)) return 'MP_EVIDENCE_MIME_INVALID';
    if (file.content.byteLength === 0) return 'INVALID_EVIDENCE_FILE';
    if (file.content.byteLength > MAX_SINGLE_EVIDENCE_BYTES) return 'EVIDENCE_FILE_SIZE_EXCEEDED';
  }
  const totalBytes = evidence.reduce((sum, file) => sum + file.content.byteLength, 0);
  if (totalBytes > MAX_TOTAL_EVIDENCE_BYTES) return 'EVIDENCE_TOTAL_SIZE_EXCEEDED';
  return null;
}

function evidenceSubmissionHash(chargebackId: string, evidence: MPChargebackEvidenceFile[]): string {
  const hash = createHash('sha256');
  hash.update(chargebackId.trim());
  for (const file of evidence) {
    hash.update('\0');
    hash.update(file.filename);
    hash.update('\0');
    hash.update(file.mimeType);
    hash.update('\0');
    hash.update(Buffer.from(file.content));
  }
  return hash.digest('hex');
}

chargebackAdminRouter.post('/api/admin/chargebacks/:id/evidence', evidenceJsonParser, async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  const id = String(req.params.id || '').trim();
  const normalized = decodeEvidenceFiles(req.body);
  const validationError = id ? validateEvidence(normalized) : 'INVALID_EVIDENCE';
  if (validationError) return res.status(validationError === 'EVIDENCE_TOTAL_SIZE_EXCEEDED' || validationError === 'EVIDENCE_FILE_SIZE_EXCEEDED' ? 413 : 400).json({ error: validationError });
  try {
    const db = getAdminDb();
    const ref = db.collection('chargebackCases').doc(id);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('CHARGEBACK_CASE_NOT_FOUND');
      const current = snap.data() || {};
      const existing = Array.isArray(current.evidenceDrafts) ? current.evidenceDrafts : [];
      const metadata = normalized.map(file => ({ filename: file.filename, mimeType: file.mimeType, size: file.content.byteLength, stagedAt: new Date().toISOString() }));
      tx.update(ref, { evidenceDrafts: [...existing, ...metadata], updatedAt: new Date().toISOString() });
    });
    return res.status(201).json({ success: true, files: normalized.map(file => ({ filename: file.filename, mimeType: file.mimeType, size: file.content.byteLength })) });
  } catch (error: any) {
    return res.status(error?.message === 'CHARGEBACK_CASE_NOT_FOUND' ? 404 : 500).json({ error: error?.message || 'EVIDENCE_SAVE_FAILED' });
  }
});

chargebackAdminRouter.post('/api/admin/chargebacks/:id/submit-evidence', evidenceJsonParser, async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'CHARGEBACK_ID_REQUIRED' });
  try {
    const db = getAdminDb();
    const caseRef = db.collection('chargebackCases').doc(id);
    const caseSnap = await caseRef.get();
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
    const validationError = validateEvidence(evidence);
    if (validationError) return res.status(validationError === 'EVIDENCE_TOTAL_SIZE_EXCEEDED' || validationError === 'EVIDENCE_FILE_SIZE_EXCEEDED' ? 413 : 400).json({ error: validationError });

    const submissionHash = evidenceSubmissionHash(id, evidence);
    const existingHash = typeof chargeback.evidenceSubmissionHash === 'string' ? chargeback.evidenceSubmissionHash : '';
    if (existingHash === submissionHash && chargeback.evidenceSubmittedAt) {
      return res.json({ success: true, idempotent: true, provider: chargeback.evidenceProviderResponse || null });
    }

    // The same case + exact evidence produces the same provider idempotency key.
    // This protects against network retries creating duplicate submissions.
    const idempotencyKey = `chargeback-evidence:${id}:${submissionHash}`;
    const result = await submitEvidenceToMP(
      id,
      evidence,
      decryptOAuthToken(encrypted),
      idempotencyKey,
      connection.externalUserId || connection.mpUserId,
    );
    await caseRef.set({
      status: 'UNDER_REVIEW',
      evidenceSubmittedAt: new Date().toISOString(),
      evidenceSubmissionHash: submissionHash,
      evidenceProviderResponse: result,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return res.json({ success: true, idempotent: false, provider: result });
  } catch (error: any) {
    return res.status(502).json({ error: 'CHARGEBACK_EVIDENCE_SUBMIT_FAILED', detail: error?.message || 'unknown' });
  }
});

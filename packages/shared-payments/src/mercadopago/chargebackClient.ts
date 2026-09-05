export interface MPChargebackCase {
  id: string;
  paymentId: string;
  amount: number;
  coverageApplied?: boolean | null;
  status?: string;
  reason?: string;
  responseDeadline?: string;
  raw: unknown;
}

export interface MPChargebackEvidenceFile {
  filename: string;
  content: Uint8Array | ArrayBuffer;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
}

async function requestJson(url: string, token: string, init: RequestInit = {}, attempts = 3): Promise<any> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
      });
      if (response.ok) return await response.json().catch(() => ({}));
      const detail = await response.text().catch(() => '');
      if (response.status >= 400 && response.status < 500 && response.status !== 429) throw new Error(`MP_CHARGEBACK_${response.status}${detail ? `:${detail.slice(0, 300)}` : ''}`);
      throw new Error(`MP_CHARGEBACK_${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('MP_CHARGEBACK_REQUEST_FAILED');
}

function normalizeCase(raw: any, fallbackId: string): MPChargebackCase {
  const id = String(raw?.id ?? fallbackId);
  const paymentId = String(raw?.payment_id ?? raw?.payment?.id ?? raw?.payments?.[0]?.id ?? '');
  const amount = Number(raw?.amount ?? raw?.amounts?.total ?? raw?.payments?.[0]?.amount ?? 0);
  const coverage = raw?.coverage_applied;
  return {
    id,
    paymentId,
    amount,
    coverageApplied: coverage === true ? true : coverage === false ? false : null,
    status: raw?.status != null ? String(raw.status) : undefined,
    reason: raw?.reason != null ? String(raw.reason) : undefined,
    responseDeadline: raw?.response_deadline != null ? String(raw.response_deadline) : undefined,
    raw,
  };
}

export async function getChargebackFromMP(chargebackId: string, accessToken: string, callerId?: string): Promise<MPChargebackCase> {
  if (!chargebackId?.trim()) throw new Error('CHARGEBACK_ID_REQUIRED');
  if (!accessToken?.trim()) throw new Error('MP_ACCESS_TOKEN_REQUIRED');
  const headers: Record<string, string> = {};
  if (callerId?.trim()) headers['X-Caller-Id'] = callerId.trim();
  const raw = await requestJson(`https://api.mercadopago.com/v1/chargebacks/${encodeURIComponent(chargebackId)}`, accessToken, { headers });
  return normalizeCase(raw, chargebackId);
}

export async function submitEvidenceToMP(chargebackId: string, evidence: MPChargebackEvidenceFile[], accessToken: string, idempotencyKey: string, callerId?: string): Promise<unknown> {
  if (!chargebackId?.trim()) throw new Error('CHARGEBACK_ID_REQUIRED');
  if (!accessToken?.trim()) throw new Error('MP_ACCESS_TOKEN_REQUIRED');
  if (!idempotencyKey?.trim()) throw new Error('MP_IDEMPOTENCY_KEY_REQUIRED');
  if (!Array.isArray(evidence) || evidence.length < 1 || evidence.length > 10) throw new Error('MP_EVIDENCE_COUNT_INVALID');

  const form = new FormData();
  for (const file of evidence) {
    if (!file?.filename?.trim()) throw new Error('MP_EVIDENCE_FILENAME_INVALID');
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimeType)) throw new Error('MP_EVIDENCE_MIME_INVALID');
    const bytes = file.content instanceof ArrayBuffer ? new Uint8Array(file.content) : file.content;
    form.append('file', new Blob([bytes], { type: file.mimeType }), file.filename.trim().slice(0, 180));
  }

  const headers: Record<string, string> = { 'X-Idempotency-Key': idempotencyKey.trim() };
  if (callerId?.trim()) headers['X-Caller-Id'] = callerId.trim();
  return requestJson(`https://api.mercadopago.com/v1/chargebacks/${encodeURIComponent(chargebackId)}/evidence`, accessToken, {
    method: 'POST',
    headers,
    body: form,
  });
}

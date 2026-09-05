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

async function requestJson(url: string, token: string, init: RequestInit = {}, attempts = 3): Promise<any> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
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

export async function getChargebackFromMP(chargebackId: string, accessToken: string): Promise<MPChargebackCase> {
  if (!chargebackId?.trim()) throw new Error('CHARGEBACK_ID_REQUIRED');
  if (!accessToken?.trim()) throw new Error('MP_ACCESS_TOKEN_REQUIRED');
  const raw = await requestJson(`https://api.mercadopago.com/v1/chargebacks/${encodeURIComponent(chargebackId)}`, accessToken);
  return normalizeCase(raw, chargebackId);
}

export async function submitEvidenceToMP(chargebackId: string, evidence: unknown, accessToken: string, idempotencyKey: string): Promise<unknown> {
  if (!chargebackId?.trim()) throw new Error('CHARGEBACK_ID_REQUIRED');
  if (!accessToken?.trim()) throw new Error('MP_ACCESS_TOKEN_REQUIRED');
  if (!idempotencyKey?.trim()) throw new Error('MP_IDEMPOTENCY_KEY_REQUIRED');
  return requestJson(`https://api.mercadopago.com/v1/chargebacks/${encodeURIComponent(chargebackId)}/evidence`, accessToken, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey },
    body: JSON.stringify(evidence),
  });
}

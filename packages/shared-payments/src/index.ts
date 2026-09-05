export type PaymentDomain = 'CONEXA' | 'NEXORA';
export type ProviderPaymentStatus =
  | 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation'
  | 'rejected' | 'cancelled' | 'refunded' | 'charged_back' | 'chargedback' | 'unknown';
export type FinancialStatus =
  | 'CREATED' | 'PAYMENT_PENDING' | 'PAID' | 'SERVICE_IN_PROGRESS' | 'SERVICE_COMPLETED'
  | 'REVIEW_COMPLETED' | 'SETTLED' | 'REFUNDED' | 'CHARGEBACK' | 'CANCELLED';
export interface SettlementTransition { status: FinancialStatus; changed: boolean; paid: boolean; refunded: boolean; chargeback: boolean; cancelled: boolean; }
export function resolveSettlementTransition(domain: PaymentDomain, currentStatus: string, providerStatus: ProviderPaymentStatus): SettlementTransition {
  const current = String(currentStatus || '').toUpperCase() as FinancialStatus;
  if (providerStatus === 'approved') {
    if (current === 'PAYMENT_PENDING' || current === 'CREATED') return { status: 'PAID', changed: true, paid: true, refunded: false, chargeback: false, cancelled: false };
    if (current === 'PAID') return { status: 'PAID', changed: false, paid: true, refunded: false, chargeback: false, cancelled: false };
    return { status: current, changed: false, paid: false, refunded: false, chargeback: false, cancelled: false };
  }
  if (providerStatus === 'refunded') {
    if (current === 'REFUNDED') return { status: 'REFUNDED', changed: false, paid: false, refunded: true, chargeback: false, cancelled: false };
    if (domain === 'NEXORA' && (current === 'PAYMENT_PENDING' || current === 'PAID')) return { status: 'REFUNDED', changed: true, paid: false, refunded: true, chargeback: false, cancelled: false };
    if (domain === 'CONEXA' && (current === 'PAYMENT_PENDING' || current === 'CREATED' || current === 'PAID' || current === 'SERVICE_IN_PROGRESS' || current === 'SERVICE_COMPLETED')) return { status: current === 'PAYMENT_PENDING' || current === 'CREATED' ? 'CANCELLED' : 'REFUNDED', changed: true, paid: false, refunded: true, chargeback: false, cancelled: current === 'PAYMENT_PENDING' || current === 'CREATED' };
    return { status: current, changed: false, paid: false, refunded: false, chargeback: false, cancelled: false };
  }
  if (providerStatus === 'charged_back' || providerStatus === 'chargedback') {
    if (current === 'CHARGEBACK') return { status: 'CHARGEBACK', changed: false, paid: false, refunded: false, chargeback: true, cancelled: false };
    return { status: 'CHARGEBACK', changed: true, paid: false, refunded: false, chargeback: true, cancelled: false };
  }
  if (providerStatus === 'cancelled' && (current === 'PAYMENT_PENDING' || current === 'CREATED')) return { status: 'CANCELLED', changed: true, paid: false, refunded: false, chargeback: false, cancelled: true };
  return { status: current, changed: false, paid: false, refunded: false, chargeback: false, cancelled: false };
}

export type ReversalKind = 'REFUND' | 'CHARGEBACK';
export function reversalLedgerKey(paymentId: string, kind: ReversalKind): string {
  const value = paymentId.trim();
  if (!value) throw new Error('PAYMENT_ID_REQUIRED');
  return `provider-reversal:${kind.toLowerCase()}:${value}`;
}
export function reversalReason(kind: ReversalKind, providerReason?: string): string {
  const reason = providerReason?.trim();
  return `${kind === 'REFUND' ? 'Mercado Pago refund' : 'Mercado Pago chargeback'}${reason ? `: ${reason}` : ''}`;
}

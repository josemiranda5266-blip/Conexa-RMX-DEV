export type EscrowStatus = 'PENDING' | 'HELD' | 'RELEASED' | 'DISPUTED' | 'REFUNDED';
export type EscrowReleaseReason = 'BUYER_CONFIRMED' | 'AUTO_RELEASE' | 'ADMIN_RESOLUTION';

export interface EscrowRecord {
  id: string;
  orderId: string;
  paymentTransactionId: string;
  buyerId: string;
  sellerId: string;
  amountArs: number;
  currency: 'ARS';
  status: EscrowStatus;
  createdAt: string;
  heldAt?: string;
  autoReleaseAt: string;
  releasedAt?: string;
  releaseReason?: EscrowReleaseReason;
  disputedAt?: string;
  disputeReason?: string;
  refundedAt?: string;
  provider: 'MERCADO_PAGO';
  providerPaymentId?: string;
  custodyMode: 'PROVIDER_SETTLED_CONTROL';
}

export type EscrowTransition = { status: EscrowStatus; changed: boolean };

export function resolveEscrowTransition(
  current: EscrowStatus,
  event: 'PAYMENT_APPROVED' | 'BUYER_CONFIRMED' | 'AUTO_RELEASE' | 'DISPUTE_OPENED' | 'PAYMENT_REFUNDED' | 'CHARGEBACK_FAVORABLE' | 'CHARGEBACK_LOST',
): EscrowTransition {
  if (event === 'PAYMENT_APPROVED' && current === 'PENDING') return { status: 'HELD', changed: true };
  if ((event === 'BUYER_CONFIRMED' || event === 'AUTO_RELEASE') && current === 'HELD') return { status: 'RELEASED', changed: true };
  if (event === 'DISPUTE_OPENED' && (current === 'HELD' || current === 'PENDING')) return { status: 'DISPUTED', changed: true };
  if (event === 'PAYMENT_REFUNDED' && current !== 'RELEASED') return { status: 'REFUNDED', changed: true };
  if (event === 'CHARGEBACK_FAVORABLE' && current === 'DISPUTED') return { status: 'RELEASED', changed: true };
  if (event === 'CHARGEBACK_LOST' && current === 'DISPUTED') return { status: 'REFUNDED', changed: true };
  return { status: current, changed: false };
}

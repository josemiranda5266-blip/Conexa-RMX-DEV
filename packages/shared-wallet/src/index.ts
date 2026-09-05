export type WalletEntryType = 'CREDIT' | 'DEBIT' | 'REFUND' | 'BONUS' | 'CROSS_SELL_REWARD';
export type WalletSource = 'CONEXA' | 'NEXORA' | 'SYSTEM';

export interface WalletTransaction {
  id: string;
  userId: string;
  type: WalletEntryType;
  source: WalletSource;
  amount: number;
  currency: 'ARS';
  referenceId?: string;
  createdAt: string;
}

/** Wallet balances must be derived from ledger entries, never trusted from the client. */
export function validateWalletAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Wallet amount must be positive');
  return Math.round(amount * 100) / 100;
}

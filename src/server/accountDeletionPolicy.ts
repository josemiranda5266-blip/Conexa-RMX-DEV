/**
 * Account deletion policy.
 *
 * Deletion is modeled as a re-entrant sequence of durable stages. The caller
 * may safely retry after a partial failure; each stage is independently
 * idempotent and the authentication account is removed only after data
 * cleanup has reached a terminal state.
 */

export const ACCOUNT_DELETION_STAGES = [
  'REQUESTED',
  'FIRESTORE_CLEANUP',
  'STORAGE_CLEANUP',
  'AUDIT_RECORDED',
  'AUTH_ACCOUNT_DELETED',
  'COMPLETED',
] as const;

export type AccountDeletionStage = typeof ACCOUNT_DELETION_STAGES[number];

export interface AccountDeletionCheckpoint {
  userId: string;
  stage: AccountDeletionStage;
  requestedAt: string;
  updatedAt: string;
  lastErrorCode?: string;
  completedAt?: string;
}

export function normalizeDeletionUserId(userId: unknown): string {
  if (typeof userId !== 'string') throw new Error('INVALID_DELETION_USER_ID');
  const normalized = userId.trim();
  if (!normalized || normalized.length > 128 || normalized.includes('/')) throw new Error('INVALID_DELETION_USER_ID');
  return normalized;
}

export function canAdvanceDeletionStage(current: AccountDeletionStage, next: AccountDeletionStage): boolean {
  const currentIndex = ACCOUNT_DELETION_STAGES.indexOf(current);
  const nextIndex = ACCOUNT_DELETION_STAGES.indexOf(next);
  return nextIndex === currentIndex + 1 || nextIndex === currentIndex;
}

export function getNextDeletionStage(stage: AccountDeletionStage): AccountDeletionStage | null {
  const index = ACCOUNT_DELETION_STAGES.indexOf(stage);
  return index >= 0 && index < ACCOUNT_DELETION_STAGES.length - 1
    ? ACCOUNT_DELETION_STAGES[index + 1]
    : null;
}

export function isTerminalDeletionStage(stage: AccountDeletionStage): boolean {
  return stage === 'COMPLETED';
}

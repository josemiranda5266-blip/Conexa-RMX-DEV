import type { EventOutboxRecord } from '@super-app/shared-events';

export const OUTBOX_MAX_ATTEMPTS = 5;

export type OutboxErrorDisposition = 'RETRYABLE' | 'PERMANENT';

export interface OutboxReplayAuthorization {
  authorized: boolean;
  actorId?: string;
  reason?: string;
}

export interface OutboxReplayUpdate {
  status: 'PENDING';
  attempts: 0;
  lastError: null;
  replayCount: number;
  replayedAt: string;
  replayedBy?: string;
  replayReason?: string;
}

const RETRYABLE_CODES = new Set([
  'ABORTED',
  'DEADLINE_EXCEEDED',
  'RESOURCE_EXHAUSTED',
  'UNAVAILABLE',
]);

const PERMANENT_CODES = new Set([
  'ALREADY_EXISTS',
  'FAILED_PRECONDITION',
  'INVALID_ARGUMENT',
  'NOT_FOUND',
  'PERMISSION_DENIED',
  'UNAUTHENTICATED',
  'INVALID_EVENT',
  'ORDER_NOT_FOUND',
  'EVENT_ORDER_USER_MISMATCH',
]);

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const value = error as { code?: unknown };
  return typeof value.code === 'string' ? value.code.toUpperCase() : undefined;
}

export function classifyOutboxError(error: unknown): OutboxErrorDisposition {
  if (error && typeof error === 'object' && 'retryable' in error) {
    return (error as { retryable?: unknown }).retryable === true ? 'RETRYABLE' : 'PERMANENT';
  }

  const code = errorCode(error);
  if (code && RETRYABLE_CODES.has(code)) return 'RETRYABLE';
  if (code && PERMANENT_CODES.has(code)) return 'PERMANENT';

  // Fail closed: an unknown error must not create an uncontrolled retry loop.
  return 'PERMANENT';
}

export function nextFailureState(
  attempts: number,
  error: unknown,
): { status: 'PENDING' | 'FAILED'; attempts: number; lastError: string } {
  const nextAttempts = Math.max(0, Number.isFinite(attempts) ? attempts : 0) + 1;
  const disposition = classifyOutboxError(error);
  const message = error instanceof Error ? error.message : 'UNKNOWN';

  return {
    status: disposition === 'RETRYABLE' && nextAttempts < OUTBOX_MAX_ATTEMPTS ? 'PENDING' : 'FAILED',
    attempts: nextAttempts,
    lastError: message,
  };
}

export function buildOutboxReplayUpdate<TPayload>(
  record: EventOutboxRecord<TPayload>,
  authorization: OutboxReplayAuthorization,
  now = new Date().toISOString(),
): OutboxReplayUpdate {
  if (!authorization.authorized) throw new Error('OUTBOX_REPLAY_UNAUTHORIZED');
  if (record.status !== 'FAILED') throw new Error('OUTBOX_REPLAY_REQUIRES_FAILED');

  const replayCount = Number.isFinite(record.replayCount) ? Number(record.replayCount) + 1 : 1;
  return {
    status: 'PENDING',
    attempts: 0,
    lastError: null,
    replayCount,
    replayedAt: now,
    ...(authorization.actorId ? { replayedBy: authorization.actorId } : {}),
    ...(authorization.reason ? { replayReason: authorization.reason } : {}),
  };
}

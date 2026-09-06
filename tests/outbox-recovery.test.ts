import assert from 'node:assert/strict';
import test from 'node:test';
import type { EventOutboxRecord } from '@super-app/shared-events';
import {
  OUTBOX_MAX_ATTEMPTS,
  buildOutboxReplayUpdate,
  classifyOutboxError,
  nextFailureState,
} from '../apps/api-conexa/src/outboxRecovery';

function baseRecord(status: EventOutboxRecord['status'] = 'FAILED'): EventOutboxRecord {
  return {
    id: 'event-1',
    type: 'CONEXA_SERVICE_CLOSED',
    occurredAt: '2026-09-06T18:00:00.000Z',
    producer: 'CONEXA',
    payload: {
      serviceRequestId: 'service-1',
      clientId: 'client-1',
      professionalId: 'professional-1',
      closedAt: '2026-09-06T18:00:00.000Z',
      closeReason: 'REVIEW_COMPLETED',
    },
    status,
    attempts: OUTBOX_MAX_ATTEMPTS,
    lastError: 'temporary failure',
    replayCount: 2,
  };
}

test('retry policy classifies transient and permanent failures explicitly', () => {
  assert.equal(classifyOutboxError({ code: 'UNAVAILABLE' }), 'RETRYABLE');
  assert.equal(classifyOutboxError({ code: 'ABORTED' }), 'RETRYABLE');
  assert.equal(classifyOutboxError({ code: 'INVALID_ARGUMENT' }), 'PERMANENT');
  assert.equal(classifyOutboxError(new Error('unknown failure')), 'PERMANENT');
});

test('retryable failures remain pending below the attempt limit', () => {
  const next = nextFailureState(2, { code: 'UNAVAILABLE' });
  assert.deepEqual(next, {
    status: 'PENDING',
    attempts: 3,
    lastError: 'UNKNOWN',
  });
});

test('permanent failures become failed immediately', () => {
  const next = nextFailureState(0, { code: 'PERMISSION_DENIED' });
  assert.deepEqual(next, {
    status: 'FAILED',
    attempts: 1,
    lastError: 'UNKNOWN',
  });
});

test('retryable failures become failed at the maximum attempt', () => {
  const next = nextFailureState(OUTBOX_MAX_ATTEMPTS - 1, { code: 'UNAVAILABLE' });
  assert.equal(next.status, 'FAILED');
  assert.equal(next.attempts, OUTBOX_MAX_ATTEMPTS);
});

test('manual replay requires authorization and only replays FAILED records', () => {
  assert.throws(
    () => buildOutboxReplayUpdate(baseRecord(), { authorized: false }),
    /OUTBOX_REPLAY_UNAUTHORIZED/,
  );
  assert.throws(
    () => buildOutboxReplayUpdate(baseRecord('PUBLISHED'), { authorized: true }),
    /OUTBOX_REPLAY_REQUIRES_FAILED/,
  );
});

test('manual replay preserves event identity and resets only the delivery attempt budget', () => {
  const record = baseRecord();
  const update = buildOutboxReplayUpdate(
    record,
    { authorized: true, actorId: 'admin-1', reason: 'incident-2026-09-06' },
    '2026-09-06T18:30:00.000Z',
  );

  assert.equal(record.id, 'event-1');
  assert.deepEqual(update, {
    status: 'PENDING',
    attempts: 0,
    lastError: null,
    replayCount: 3,
    replayedAt: '2026-09-06T18:30:00.000Z',
    replayedBy: 'admin-1',
    replayReason: 'incident-2026-09-06',
  });
});

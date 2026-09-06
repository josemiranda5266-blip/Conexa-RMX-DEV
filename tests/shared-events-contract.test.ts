import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createConexaServiceClosedEvent,
  isConexaServiceClosedEvent,
} from '../packages/shared-events/src/index.ts';

test('CONEXA_SERVICE_CLOSED contract accepts the canonical payload', () => {
  const event = createConexaServiceClosedEvent({
    serviceRequestId: 'service-123',
    clientId: 'client-123',
    professionalId: 'professional-123',
    closedAt: '2026-09-06T17:00:00.000Z',
  });

  assert.deepEqual(event, {
    serviceRequestId: 'service-123',
    clientId: 'client-123',
    professionalId: 'professional-123',
    closedAt: '2026-09-06T17:00:00.000Z',
    closeReason: 'REVIEW_COMPLETED',
  });
  assert.equal(isConexaServiceClosedEvent(event), true);
});

test('CONEXA_SERVICE_CLOSED validator rejects missing identity and invalid close reason', () => {
  assert.equal(
    isConexaServiceClosedEvent({
      serviceRequestId: 'service-123',
      clientId: '',
      professionalId: 'professional-123',
      closedAt: '2026-09-06T17:00:00.000Z',
      closeReason: 'REVIEW_COMPLETED',
    }),
    false,
  );

  assert.equal(
    isConexaServiceClosedEvent({
      serviceRequestId: 'service-123',
      clientId: 'client-123',
      professionalId: 'professional-123',
      closedAt: '2026-09-06T17:00:00.000Z',
      closeReason: 'MANUAL_ADMIN',
    }),
    false,
  );
});

test('CONEXA_SERVICE_CLOSED validator rejects malformed dates', () => {
  assert.equal(
    isConexaServiceClosedEvent({
      serviceRequestId: 'service-123',
      clientId: 'client-123',
      professionalId: 'professional-123',
      closedAt: 'not-a-date',
      closeReason: 'REVIEW_COMPLETED',
    }),
    false,
  );
});

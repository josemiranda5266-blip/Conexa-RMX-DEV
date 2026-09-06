import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createConexaServiceClosedEvent,
  isConexaServiceClosedDomainEvent,
  isConexaServiceClosedEvent,
  isDomainEvent,
} from '../packages/shared-events/src/index.ts';

const payload = createConexaServiceClosedEvent({
  serviceRequestId: 'service-123',
  clientId: 'client-123',
  professionalId: 'professional-123',
  closedAt: '2026-09-06T17:00:00.000Z',
});

test('CONEXA_SERVICE_CLOSED contract accepts the canonical payload', () => {
  assert.deepEqual(payload, {
    serviceRequestId: 'service-123',
    clientId: 'client-123',
    professionalId: 'professional-123',
    closedAt: '2026-09-06T17:00:00.000Z',
    closeReason: 'REVIEW_COMPLETED',
  });
  assert.equal(isConexaServiceClosedEvent(payload), true);
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

test('CONEXA_SERVICE_CLOSED envelope requires canonical identity and producer', () => {
  const event = {
    id: 'conexa-service-closed:service-123',
    type: 'CONEXA_SERVICE_CLOSED',
    occurredAt: '2026-09-06T17:00:01.000Z',
    producer: 'CONEXA',
    payload,
  } as const;

  assert.equal(isDomainEvent(event), true);
  assert.equal(isConexaServiceClosedDomainEvent(event), true);

  assert.equal(
    isConexaServiceClosedDomainEvent({ ...event, id: '' }),
    false,
  );
  assert.equal(
    isConexaServiceClosedDomainEvent({ ...event, producer: 'NEXORA' }),
    false,
  );
  assert.equal(
    isConexaServiceClosedDomainEvent({ ...event, type: 'NEXORA_ORDER_COMPLETED' }),
    false,
  );
});

test('CONEXA_SERVICE_CLOSED envelope rejects invalid occurredAt and payload', () => {
  const event = {
    id: 'conexa-service-closed:service-123',
    type: 'CONEXA_SERVICE_CLOSED',
    occurredAt: 'not-a-date',
    producer: 'CONEXA',
    payload,
  };

  assert.equal(isConexaServiceClosedDomainEvent(event), false);
  assert.equal(
    isConexaServiceClosedDomainEvent({
      ...event,
      occurredAt: '2026-09-06T17:00:01.000Z',
      payload: { ...payload, closeReason: 'MANUAL_ADMIN' },
    }),
    false,
  );
});

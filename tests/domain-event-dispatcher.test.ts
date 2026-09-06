import assert from 'node:assert/strict';
import test from 'node:test';
import { dispatchDomainEvent } from '../apps/api-conexa/src/eventDispatcher.ts';

const validConexaClosedEvent = {
  id: 'conexa-service-closed:service-dispatch-test',
  type: 'CONEXA_SERVICE_CLOSED' as const,
  occurredAt: '2026-09-06T18:00:00.000Z',
  producer: 'CONEXA' as const,
  payload: {
    serviceRequestId: 'service-dispatch-test',
    clientId: 'client-dispatch-test',
    professionalId: 'professional-dispatch-test',
    closedAt: '2026-09-06T18:00:00.000Z',
    closeReason: 'REVIEW_COMPLETED' as const,
  },
};

test('dispatcher routes CONEXA_SERVICE_CLOSED by canonical event type', async () => {
  const received: string[] = [];

  await dispatchDomainEvent(validConexaClosedEvent, {
    CONEXA_SERVICE_CLOSED: async event => {
      received.push(event.id);
    },
  });

  assert.deepEqual(received, ['conexa-service-closed:service-dispatch-test']);
});

test('dispatcher rejects malformed envelopes before invoking a handler', async () => {
  let invoked = false;

  await assert.rejects(
    dispatchDomainEvent(
      { ...validConexaClosedEvent, producer: 'NEXORA' },
      {
        CONEXA_SERVICE_CLOSED: async () => {
          invoked = true;
        },
      },
    ),
    /INVALID_DOMAIN_EVENT/,
  );

  assert.equal(invoked, false);
});

test('dispatcher rejects unsupported event types without a handler', async () => {
  const event = {
    id: 'nexora-order-completed:dispatch-test',
    type: 'NEXORA_ORDER_COMPLETED' as const,
    occurredAt: '2026-09-06T18:00:00.000Z',
    producer: 'NEXORA' as const,
    payload: { orderId: 'order-dispatch-test' },
  };

  await assert.rejects(
    dispatchDomainEvent(event, {}),
    /UNSUPPORTED_DOMAIN_EVENT_TYPE:NEXORA_ORDER_COMPLETED/,
  );
});

test('dispatcher passes the same canonical event id to repeated deliveries', async () => {
  const received: string[] = [];
  const handlers = {
    CONEXA_SERVICE_CLOSED: async event => {
      received.push(event.id);
    },
  };

  await dispatchDomainEvent(validConexaClosedEvent, handlers);
  await dispatchDomainEvent(validConexaClosedEvent, handlers);

  assert.deepEqual(received, [
    'conexa-service-closed:service-dispatch-test',
    'conexa-service-closed:service-dispatch-test',
  ]);
});

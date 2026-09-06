import {
  isConexaServiceClosedDomainEvent,
  isDomainEvent,
  type DomainEvent,
  type DomainEventType,
} from '@super-app/shared-events';

export type DomainEventHandler<TEvent extends DomainEvent = DomainEvent> = (
  event: TEvent,
) => Promise<void>;

export type DomainEventHandlerRegistry = Partial<
  Record<DomainEventType, DomainEventHandler>
>;

export async function dispatchDomainEvent(
  value: unknown,
  handlers: DomainEventHandlerRegistry,
): Promise<void> {
  if (!isDomainEvent(value)) {
    throw new Error('INVALID_DOMAIN_EVENT');
  }

  if (value.type === 'CONEXA_SERVICE_CLOSED' && !isConexaServiceClosedDomainEvent(value)) {
    throw new Error('INVALID_CONEXA_SERVICE_CLOSED_EVENT');
  }

  const handler = handlers[value.type];
  if (!handler) {
    throw new Error(`UNSUPPORTED_DOMAIN_EVENT_TYPE:${value.type}`);
  }

  // The canonical idempotency key is DomainEvent.id. The dispatcher deliberately
  // does not persist delivery state; the durable consumer must use this ID when
  // recording/guarding side effects transactionally.
  await handler(value);
}

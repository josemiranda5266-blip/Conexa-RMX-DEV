export type DomainEventType = 'NEXORA_ORDER_COMPLETED' | 'CONEXA_SERVICE_CLOSED';

export type DomainEventProducer = 'CONEXA' | 'NEXORA';

export interface ConexaServiceClosedEvent {
  serviceRequestId: string;
  clientId: string;
  professionalId: string;
  closedAt: string;
  closeReason: 'REVIEW_COMPLETED';
}

export interface DomainEvent<TPayload = unknown> {
  id: string;
  type: DomainEventType;
  occurredAt: string;
  producer: DomainEventProducer;
  payload: TPayload;
}

export interface EventOutboxRecord<TPayload = unknown> extends DomainEvent<TPayload> {
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  attempts: number;
  lastError?: string | null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

export function isConexaServiceClosedEvent(value: unknown): value is ConexaServiceClosedEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  return (
    isNonEmptyString(event.serviceRequestId) &&
    isNonEmptyString(event.clientId) &&
    isNonEmptyString(event.professionalId) &&
    isIsoDate(event.closedAt) &&
    event.closeReason === 'REVIEW_COMPLETED'
  );
}

export function createConexaServiceClosedEvent(input: {
  serviceRequestId: string;
  clientId: string;
  professionalId: string;
  closedAt: string;
}): ConexaServiceClosedEvent {
  const event: ConexaServiceClosedEvent = {
    serviceRequestId: input.serviceRequestId.trim(),
    clientId: input.clientId.trim(),
    professionalId: input.professionalId.trim(),
    closedAt: input.closedAt,
    closeReason: 'REVIEW_COMPLETED',
  };

  if (!isConexaServiceClosedEvent(event)) throw new Error('INVALID_CONEXA_SERVICE_CLOSED_EVENT');
  return event;
}

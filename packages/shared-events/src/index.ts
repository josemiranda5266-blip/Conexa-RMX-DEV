export type DomainEventType = 'NEXORA_ORDER_COMPLETED' | 'CONEXA_SERVICE_CLOSED';

export type DomainEventProducer = 'CONEXA' | 'NEXORA';

export interface NexoraOrderCompletedEvent {
  eventId: string;
  type: 'NEXORA_ORDER_COMPLETED';
  occurredAt: string;
  userId: string;
  orderId: string;
  listingIds: string[];
  requiresInstallation: boolean;
}

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
  replayCount?: number;
}

const MAX_ID_LENGTH = 128;
const MAX_DATE_LENGTH = 64;
const MAX_LISTING_IDS = 100;

function isNonEmptyString(value: unknown, maxLength = MAX_ID_LENGTH): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function isIsoDate(value: unknown): value is string {
  return isNonEmptyString(value, MAX_DATE_LENGTH) && Number.isFinite(Date.parse(value));
}

export function isNexoraOrderCompletedEvent(value: unknown): value is NexoraOrderCompletedEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  return (
    isNonEmptyString(event.eventId) &&
    event.type === 'NEXORA_ORDER_COMPLETED' &&
    isIsoDate(event.occurredAt) &&
    isNonEmptyString(event.userId) &&
    isNonEmptyString(event.orderId) &&
    Array.isArray(event.listingIds) &&
    event.listingIds.length <= MAX_LISTING_IDS &&
    event.listingIds.every((listingId) => isNonEmptyString(listingId)) &&
    typeof event.requiresInstallation === 'boolean'
  );
}

export function createNexoraOrderCompletedEvent(input: {
  eventId: string;
  occurredAt: string;
  userId: string;
  orderId: string;
  listingIds: string[];
  requiresInstallation: boolean;
}): NexoraOrderCompletedEvent {
  const event: NexoraOrderCompletedEvent = {
    eventId: input.eventId.trim(),
    type: 'NEXORA_ORDER_COMPLETED',
    occurredAt: input.occurredAt,
    userId: input.userId.trim(),
    orderId: input.orderId.trim(),
    listingIds: input.listingIds.map(value => value.trim()).filter(Boolean),
    requiresInstallation: input.requiresInstallation,
  };
  if (!isNexoraOrderCompletedEvent(event)) throw new Error('INVALID_NEXORA_ORDER_COMPLETED_EVENT');
  return event;
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

export function isDomainEvent(value: unknown): value is DomainEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;

  if (
    !isNonEmptyString(event.id) ||
    !isNonEmptyString(event.type) ||
    !isIsoDate(event.occurredAt) ||
    !isNonEmptyString(event.producer)
  ) {
    return false;
  }

  if (event.type === 'CONEXA_SERVICE_CLOSED') {
    return event.producer === 'CONEXA' && isConexaServiceClosedEvent(event.payload);
  }

  if (event.type === 'NEXORA_ORDER_COMPLETED') {
    return event.producer === 'NEXORA' && isNexoraOrderCompletedEvent(event.payload);
  }

  return false;
}

export function isConexaServiceClosedDomainEvent(
  value: unknown,
): value is DomainEvent<ConexaServiceClosedEvent> {
  if (!isDomainEvent(value)) return false;
  return value.type === 'CONEXA_SERVICE_CLOSED' && value.producer === 'CONEXA';
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

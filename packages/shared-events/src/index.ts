export type DomainEventType = 'NEXORA_ORDER_COMPLETED' | 'CONEXA_SERVICE_CLOSED';

export interface DomainEvent<TPayload = unknown> {
  id: string;
  type: DomainEventType;
  occurredAt: string;
  producer: 'CONEXA' | 'NEXORA';
  payload: TPayload;
}

export interface EventOutboxRecord<TPayload = unknown> extends DomainEvent<TPayload> {
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  attempts: number;
  lastError?: string;
}

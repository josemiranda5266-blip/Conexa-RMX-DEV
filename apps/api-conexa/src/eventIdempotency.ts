import type { Firestore, Transaction } from 'firebase-admin/firestore';
import type { DomainEvent } from '@super-app/shared-events';

export type EventIdempotencyResult = 'PROCESSED' | 'ALREADY_PROCESSED';

export interface EventIdempotencyRecord {
  eventId: string;
  eventType: DomainEvent['type'];
  producer: DomainEvent['producer'];
  processedAt: string;
}

/**
 * Executes a Firestore-only event effect exactly once per DomainEvent.id.
 *
 * The ledger write and the effect must happen in the same Firestore transaction.
 * If the transaction is retried because of contention, the application effect
 * must be deterministic and must not perform external I/O.
 */
export async function runEventIdempotently(
  firestore: Firestore,
  event: DomainEvent,
  effect: (tx: Transaction) => Promise<void> | void,
): Promise<EventIdempotencyResult> {
  return firestore.runTransaction(async tx => {
    const ledgerRef = firestore.collection('processedEvents').doc(event.id);
    const ledger = await tx.get(ledgerRef);

    if (ledger.exists) return 'ALREADY_PROCESSED';

    await effect(tx);

    const record: EventIdempotencyRecord = {
      eventId: event.id,
      eventType: event.type,
      producer: event.producer,
      processedAt: new Date().toISOString(),
    };

    tx.create(ledgerRef, record);
    return 'PROCESSED';
  });
}

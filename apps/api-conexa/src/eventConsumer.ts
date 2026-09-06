import type { NexoraOrderCompletedEvent } from '@super-app/shared-types';
import type { DomainEvent } from '@super-app/shared-events';
import type { DocumentReference, Firestore, Transaction } from 'firebase-admin/firestore';
import { dispatchDomainEvent } from './eventDispatcher.js';
import { getAdminDb } from '../../../src/server/firebaseAdmin.js';
import { runEventIdempotently, type EventIdempotencyResult } from './eventIdempotency.js';
import { nextFailureState } from './outboxRecovery.js';

function db(): Firestore {
  return getAdminDb() as Firestore;
}

function buildDomainEvent(data: Record<string, unknown>): DomainEvent {
  const id = typeof data.id === 'string' ? data.id : '';
  const type = data.type;
  const occurredAt = typeof data.occurredAt === 'string' ? data.occurredAt : '';
  const producer = data.producer;
  const payload = data.payload;

  if (!id || type !== 'NEXORA_ORDER_COMPLETED' || !occurredAt || producer !== 'NEXORA' || !payload || typeof payload !== 'object') {
    throw new Error('INVALID_EVENT');
  }

  return { id, type, occurredAt, producer, payload } as DomainEvent;
}

async function handleNexoraOrderCompleted(event: DomainEvent): Promise<EventIdempotencyResult> {
  const firestore = db();
  const payload = event.payload as NexoraOrderCompletedEvent;
  const eventRef = firestore.collection('eventOutbox').doc(event.id) as DocumentReference;

  return runEventIdempotently(firestore, event, async (tx: Transaction) => {
    const current = await tx.get(eventRef);
    if (!current.exists || current.data()?.status !== 'PENDING') return;

    const orderRef = firestore.collection('orders').doc(payload.orderId) as DocumentReference;
    const order = await tx.get(orderRef);
    if (!order.exists) throw new Error('ORDER_NOT_FOUND');

    const orderData = order.data() || {};
    const attempts = Number(current.data()?.attempts ?? 0) + 1;

    if (String(orderData.status || '').toUpperCase() !== 'COMPLETED') {
      tx.update(eventRef, { status: 'PUBLISHED', processedAt: new Date().toISOString(), attempts, lastError: 'EVENT_STALE_ORDER_NOT_COMPLETED' });
      return;
    }

    if (String(orderData.buyerId || '') !== payload.userId) throw new Error('EVENT_ORDER_USER_MISMATCH');

    if (payload.requiresInstallation !== true || orderData.requiresInstallation !== true) {
      tx.update(eventRef, { status: 'PUBLISHED', processedAt: new Date().toISOString(), attempts, lastError: 'EVENT_NOT_REQUIRING_INSTALLATION' });
      return;
    }

    const leadRef = firestore.collection('installationLeads').doc(payload.orderId) as DocumentReference;
    const lead = await tx.get(leadRef);
    if (!lead.exists) {
      tx.create(leadRef, {
        sourceEventId: event.id,
        userId: payload.userId,
        orderId: payload.orderId,
        serviceType: 'INSTALLATION',
        status: 'NEW',
        createdAt: new Date().toISOString(),
      });
    }

    tx.update(eventRef, { status: 'PUBLISHED', processedAt: new Date().toISOString(), attempts, lastError: null });
  });
}

export async function processNexoraOrderCompleted(limit = 20): Promise<number> {
  const firestore = db();
  const snapshot = await firestore.collection('eventOutbox')
    .where('type', '==', 'NEXORA_ORDER_COMPLETED')
    .where('status', '==', 'PENDING')
    .limit(Math.min(Math.max(limit, 1), 50))
    .get();

  let processed = 0;
  for (const eventDoc of snapshot.docs) {
    try {
      const event = buildDomainEvent(eventDoc.data() || {});
      let result: EventIdempotencyResult = 'ALREADY_PROCESSED';
      await dispatchDomainEvent(event, {
        NEXORA_ORDER_COMPLETED: async domainEvent => {
          result = await handleNexoraOrderCompleted(domainEvent);
        },
      });
      if (result === 'PROCESSED') processed++;
    } catch (error) {
      await firestore.runTransaction(async (tx: Transaction) => {
        const current = await tx.get(eventDoc.ref);
        if (!current.exists || current.data()?.status !== 'PENDING') return;

        const failure = nextFailureState(Number(current.data()?.attempts ?? 0), error);
        tx.update(eventDoc.ref, {
          ...failure,
          updatedAt: new Date().toISOString(),
        });
      }).catch(() => undefined);
    }
  }
  return processed;
}

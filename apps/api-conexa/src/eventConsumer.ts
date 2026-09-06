import type { NexoraOrderCompletedEvent } from '@super-app/shared-types';
import type { DomainEvent } from '@super-app/shared-events';
import { dispatchDomainEvent } from './eventDispatcher.js';
import { getAdminDb } from '../../../src/server/firebaseAdmin.js';
import { runEventIdempotently } from './eventIdempotency.js';

const MAX_ATTEMPTS = 5;

function db() {
  return getAdminDb();
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

async function handleNexoraOrderCompleted(event: DomainEvent): Promise<void> {
  const firestore = db();
  const payload = event.payload as NexoraOrderCompletedEvent;
  const eventRef = firestore.collection('eventOutbox').doc(event.id);

  await runEventIdempotently(firestore, event, async tx => {
    const current = await tx.get(eventRef);
    if (!current.exists || current.data()?.status !== 'PENDING') return;

    const orderRef = firestore.collection('orders').doc(payload.orderId);
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

    const leadRef = firestore.collection('installationLeads').doc(payload.orderId);
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
      await dispatchDomainEvent(event, { NEXORA_ORDER_COMPLETED: handleNexoraOrderCompleted });
      processed++;
    } catch (error) {
      await firestore.runTransaction(async tx => {
        const current = await tx.get(eventDoc.ref);
        if (!current.exists || current.data()?.status !== 'PENDING') return;
        const attempts = Number(current.data()?.attempts ?? 0) + 1;
        tx.update(eventDoc.ref, {
          status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
          lastError: error instanceof Error ? error.message : 'UNKNOWN',
          attempts,
          updatedAt: new Date().toISOString(),
        });
      }).catch(() => undefined);
    }
  }
  return processed;
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminDb } from '../src/server/firebaseAdmin.js';
import { processNexoraOrderCompleted } from '../apps/api-conexa/src/eventConsumer.js';

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || '';

function requireEmulator(): void {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST is required');
  assert.match(PROJECT_ID, /^demo-/, 'test project must be demo-*');
}

function event(id: string, orderId: string) {
  return {
    id,
    type: 'NEXORA_ORDER_COMPLETED',
    occurredAt: '2026-09-06T18:00:00.000Z',
    producer: 'NEXORA',
    payload: {
      userId: 'dispatcher-user',
      orderId,
      listingIds: ['listing-1'],
      requiresInstallation: true,
    },
    status: 'PENDING',
    attempts: 0,
    lastError: null,
  };
}

test('dispatcher E2E: outbox routes through dispatcher and creates one installation lead', async () => {
  requireEmulator();
  const db = getAdminDb();
  const orderId = 'dispatcher-e2e-order-1';
  const eventId = 'dispatcher-e2e-event-1';

  await db.collection('orders').doc(orderId).set({
    buyerId: 'dispatcher-user',
    status: 'COMPLETED',
    requiresInstallation: true,
  });
  await db.collection('eventOutbox').doc(eventId).set(event(eventId, orderId));

  const processed = await processNexoraOrderCompleted(20);
  assert.equal(processed, 1);

  const outbox = await db.collection('eventOutbox').doc(eventId).get();
  const lead = await db.collection('installationLeads').doc(orderId).get();
  const ledger = await db.collection('processedEvents').doc(eventId).get();

  assert.equal(outbox.data()?.status, 'PUBLISHED');
  assert.equal(lead.exists, true);
  assert.equal(lead.data()?.sourceEventId, eventId);
  assert.equal(ledger.exists, true);
});

test('dispatcher E2E: concurrent deliveries remain idempotent', async () => {
  requireEmulator();
  const db = getAdminDb();
  const orderId = 'dispatcher-e2e-order-2';
  const eventId = 'dispatcher-e2e-event-2';

  await db.collection('orders').doc(orderId).set({
    buyerId: 'dispatcher-user-2',
    status: 'COMPLETED',
    requiresInstallation: true,
  });
  await db.collection('eventOutbox').doc(eventId).set({
    ...event(eventId, orderId),
    payload: { ...event(eventId, orderId).payload, userId: 'dispatcher-user-2' },
  });

  await Promise.all([
    processNexoraOrderCompleted(20),
    processNexoraOrderCompleted(20),
  ]);

  const outbox = await db.collection('eventOutbox').doc(eventId).get();
  const lead = await db.collection('installationLeads').doc(orderId).get();
  const ledger = await db.collection('processedEvents').doc(eventId).get();

  assert.equal(outbox.data()?.status, 'PUBLISHED');
  assert.equal(lead.exists, true);
  assert.equal(ledger.exists, true);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminDb } from '../src/server/firebaseAdmin.js';
import { processNexoraOrderCompleted } from '../apps/api-conexa/src/eventConsumer.js';

const TEST_PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || '';

function requireEmulator(): void {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST,
    'FIRESTORE_EMULATOR_HOST is required; refusing to run against a live Firestore database',
  );
  assert.match(
    TEST_PROJECT_ID,
    /^demo-/,
    'GCLOUD_PROJECT/FIREBASE_PROJECT_ID must use a demo-* project for emulator tests',
  );
}

function seedEvent(id: string, orderId: string): Record<string, unknown> {
  return {
    id,
    type: 'NEXORA_ORDER_COMPLETED',
    occurredAt: '2026-09-06T18:30:00.000Z',
    producer: 'NEXORA',
    payload: {
      eventId: id,
      type: 'NEXORA_ORDER_COMPLETED',
      occurredAt: '2026-09-06T18:30:00.000Z',
      userId: 'buyer-consumer-test',
      orderId,
      listingIds: ['listing-consumer-test'],
      requiresInstallation: true,
    },
    status: 'PENDING',
    attempts: 0,
  };
}

test('Nexora consumer: concurrent workers create one lead and publish once', async () => {
  requireEmulator();
  const db = getAdminDb();
  const eventId = 'nexora-consumer-concurrency-1';
  const orderId = 'order-consumer-concurrency-1';

  await db.collection('orders').doc(orderId).set({
    status: 'COMPLETED',
    buyerId: 'buyer-consumer-test',
    requiresInstallation: true,
  });
  await db.collection('eventOutbox').doc(eventId).set(seedEvent(eventId, orderId));

  const results = await Promise.all([
    processNexoraOrderCompleted(),
    processNexoraOrderCompleted(),
  ]);

  const event = await db.collection('eventOutbox').doc(eventId).get();
  const lead = await db.collection('installationLeads').doc(orderId).get();
  const ledger = await db.collection('processedEvents').doc(eventId).get();

  assert.equal(results.reduce((sum, value) => sum + value, 0), 1);
  assert.equal(event.data()?.status, 'PUBLISHED');
  assert.equal(lead.exists, true);
  assert.equal(lead.data()?.sourceEventId, eventId);
  assert.equal(ledger.exists, true);
});

test('Nexora consumer: repeated delivery is a durable no-op', async () => {
  requireEmulator();
  const db = getAdminDb();
  const eventId = 'nexora-consumer-repeat-1';
  const orderId = 'order-consumer-repeat-1';

  await db.collection('orders').doc(orderId).set({
    status: 'COMPLETED',
    buyerId: 'buyer-consumer-test',
    requiresInstallation: true,
  });
  await db.collection('eventOutbox').doc(eventId).set(seedEvent(eventId, orderId));

  const first = await processNexoraOrderCompleted();
  const second = await processNexoraOrderCompleted();

  assert.equal(first, 1);
  assert.equal(second, 0);
  assert.equal((await db.collection('installationLeads').doc(orderId).get()).exists, true);
  assert.equal((await db.collection('processedEvents').doc(eventId).get()).exists, true);
});

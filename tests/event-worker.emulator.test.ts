import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminDb } from '../src/server/firebaseAdmin.js';
import { runNexoraOutboxWorker } from '../apps/event-worker/src/index.js';

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || '';

function requireEmulator(): void {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST is required');
  assert.match(PROJECT_ID, /^demo-/, 'test project must be demo-*');
}

function seedEvent(id: string, orderId: string, userId = 'worker-test-user') {
  return {
    id,
    type: 'NEXORA_ORDER_COMPLETED',
    occurredAt: '2026-09-06T19:00:00.000Z',
    producer: 'NEXORA',
    payload: {
      userId,
      orderId,
      listingIds: ['worker-test-listing'],
      requiresInstallation: true,
    },
    status: 'PENDING',
    attempts: 0,
    lastError: null,
  };
}

async function seedPendingOrder(eventId: string, orderId: string, userId = 'worker-test-user') {
  const db = getAdminDb();
  await db.collection('orders').doc(orderId).set({
    buyerId: userId,
    status: 'COMPLETED',
    requiresInstallation: true,
  });
  await db.collection('eventOutbox').doc(eventId).set(seedEvent(eventId, orderId, userId));
}

test('event worker: scheduled pipeline publishes one event and creates one installation lead', async () => {
  requireEmulator();
  const db = getAdminDb();
  const eventId = 'event-worker-pipeline-1';
  const orderId = 'event-worker-order-1';

  await seedPendingOrder(eventId, orderId);

  const processed = await runNexoraOutboxWorker();

  const outbox = await db.collection('eventOutbox').doc(eventId).get();
  const lead = await db.collection('installationLeads').doc(orderId).get();
  const ledger = await db.collection('processedEvents').doc(eventId).get();

  assert.equal(processed, 1);
  assert.equal(outbox.data()?.status, 'PUBLISHED');
  assert.equal(outbox.data()?.attempts, 1);
  assert.equal(lead.exists, true);
  assert.equal(lead.data()?.sourceEventId, eventId);
  assert.equal(ledger.exists, true);
});

test('event worker: concurrent executions remain idempotent', async () => {
  requireEmulator();
  const db = getAdminDb();
  const eventId = 'event-worker-concurrency-1';
  const orderId = 'event-worker-order-concurrency-1';

  await seedPendingOrder(eventId, orderId);

  const results = await Promise.all([
    runNexoraOutboxWorker(),
    runNexoraOutboxWorker(),
  ]);

  const outbox = await db.collection('eventOutbox').doc(eventId).get();
  const lead = await db.collection('installationLeads').doc(orderId).get();
  const ledger = await db.collection('processedEvents').doc(eventId).get();

  // Both scheduled invocations may successfully claim the same delivery batch.
  // Durable idempotency guarantees that only one invocation performs the effect.
  assert.deepEqual(results, [1, 1]);
  assert.equal(outbox.data()?.status, 'PUBLISHED');
  assert.equal(outbox.data()?.attempts, 1);
  assert.equal(lead.exists, true);
  assert.equal(ledger.exists, true);
});

test('event worker: empty execution is successful and processes zero events', async () => {
  requireEmulator();

  const processed = await runNexoraOutboxWorker();

  assert.equal(processed, 0);
});

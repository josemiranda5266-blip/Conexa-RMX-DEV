import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminDb } from '../src/server/firebaseAdmin.js';
import { processNexoraOrderCompleted } from '../apps/api-conexa/src/eventConsumer.js';
import { buildOutboxReplayUpdate } from '../apps/api-conexa/src/outboxRecovery.js';

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || '';

function requireEmulator(): void {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST is required');
  assert.match(PROJECT_ID, /^demo-/, 'test project must be demo-*');
}

function baseEvent(id: string, orderId: string) {
  return {
    id,
    type: 'NEXORA_ORDER_COMPLETED',
    occurredAt: '2026-09-06T19:00:00.000Z',
    producer: 'NEXORA',
    payload: {
      userId: 'recovery-user',
      orderId,
      listingIds: ['listing-1'],
      requiresInstallation: true,
    },
    status: 'PENDING',
    attempts: 0,
    lastError: null,
    replayCount: 0,
  };
}

test('outbox recovery E2E: permanent failure becomes FAILED, authorized replay preserves identity and succeeds', async () => {
  requireEmulator();
  const db = getAdminDb();
  const eventId = 'recovery-e2e-event-1';
  const orderId = 'recovery-e2e-order-1';
  const eventRef = db.collection('eventOutbox').doc(eventId);

  await eventRef.set({ ...baseEvent(eventId, orderId), producer: 'BROKEN' });

  await processNexoraOrderCompleted(20);
  let outbox = await eventRef.get();
  assert.equal(outbox.data()?.status, 'FAILED');
  assert.equal(outbox.data()?.attempts, 1);
  assert.equal(outbox.data()?.lastError, 'INVALID_EVENT');

  const replay = buildOutboxReplayUpdate(outbox.data() as never, {
    authorized: true,
    actorId: 'admin-1',
    reason: 'repair producer metadata',
  });
  assert.equal(replay.status, 'PENDING');
  assert.equal(replay.attempts, 0);
  assert.equal(replay.replayCount, 1);

  await eventRef.update({
    ...replay,
    id: eventId,
    producer: 'NEXORA',
  });
  await db.collection('orders').doc(orderId).set({
    buyerId: 'recovery-user',
    status: 'COMPLETED',
    requiresInstallation: true,
  });

  await processNexoraOrderCompleted(20);

  outbox = await eventRef.get();
  const lead = await db.collection('installationLeads').doc(orderId).get();
  const ledger = await db.collection('processedEvents').doc(eventId).get();

  assert.equal(outbox.data()?.status, 'PUBLISHED');
  assert.equal(outbox.data()?.id, eventId);
  assert.equal(outbox.data()?.replayCount, 1);
  assert.equal(lead.exists, true);
  assert.equal(lead.data()?.sourceEventId, eventId);
  assert.equal(ledger.exists, true);
});

test('outbox recovery E2E: unauthorized replay is rejected and FAILED event remains untouched', async () => {
  requireEmulator();
  const db = getAdminDb();
  const eventId = 'recovery-e2e-event-2';
  const orderId = 'recovery-e2e-order-2';
  const eventRef = db.collection('eventOutbox').doc(eventId);

  await eventRef.set({ ...baseEvent(eventId, orderId), producer: 'BROKEN' });
  await processNexoraOrderCompleted(20);

  const failed = await eventRef.get();
  assert.equal(failed.data()?.status, 'FAILED');

  assert.throws(
    () => buildOutboxReplayUpdate(failed.data() as never, { authorized: false }),
    /OUTBOX_REPLAY_UNAUTHORIZED/,
  );

  const unchanged = await eventRef.get();
  assert.equal(unchanged.data()?.status, 'FAILED');
  assert.equal(unchanged.data()?.replayCount, 0);
  assert.equal((await db.collection('processedEvents').doc(eventId).get()).exists, false);
});

test('outbox recovery E2E: concurrent deliveries after replay create one installation lead', async () => {
  requireEmulator();
  const db = getAdminDb();
  const eventId = 'recovery-e2e-event-3';
  const orderId = 'recovery-e2e-order-3';
  const eventRef = db.collection('eventOutbox').doc(eventId);

  await eventRef.set({ ...baseEvent(eventId, orderId), producer: 'BROKEN' });
  await processNexoraOrderCompleted(20);
  const failed = await eventRef.get();
  const replay = buildOutboxReplayUpdate(failed.data() as never, { authorized: true, actorId: 'admin-2' });
  await eventRef.update({ ...replay, id: eventId, producer: 'NEXORA' });
  await db.collection('orders').doc(orderId).set({
    buyerId: 'recovery-user',
    status: 'COMPLETED',
    requiresInstallation: true,
  });

  await Promise.all([
    processNexoraOrderCompleted(20),
    processNexoraOrderCompleted(20),
  ]);

  const outbox = await eventRef.get();
  const lead = await db.collection('installationLeads').doc(orderId).get();
  const ledger = await db.collection('processedEvents').doc(eventId).get();

  assert.equal(outbox.data()?.status, 'PUBLISHED');
  assert.equal(lead.exists, true);
  assert.equal(lead.data()?.sourceEventId, eventId);
  assert.equal(ledger.exists, true);
});

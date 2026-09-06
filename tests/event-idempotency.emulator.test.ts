import assert from 'node:assert/strict';
import test from 'node:test';
import type { DomainEvent } from '@super-app/shared-events';
import { getAdminDb } from '../src/server/firebaseAdmin.js';
import { runEventIdempotently } from '../apps/api-conexa/src/eventIdempotency.js';

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

function event(id: string): DomainEvent {
  return {
    id,
    type: 'CONEXA_SERVICE_CLOSED',
    occurredAt: '2026-09-06T18:00:00.000Z',
    producer: 'CONEXA',
    payload: {
      serviceRequestId: 'service-idempotency-test',
      clientId: 'client-idempotency-test',
      professionalId: 'professional-idempotency-test',
      closedAt: '2026-09-06T18:00:00.000Z',
      closeReason: 'REVIEW_COMPLETED',
    },
  };
}

test('event idempotency: concurrent deliveries execute the Firestore effect once', async () => {
  requireEmulator();
  const db = getAdminDb();
  const currentEvent = event('conexa-service-closed-idempotency-1');
  const effectRef = db.collection('idempotencyTestEffects').doc('service-idempotency-test');

  await Promise.all([
    runEventIdempotently(db, currentEvent, tx => {
      tx.create(effectRef, { executions: 1, createdAt: new Date().toISOString() });
    }),
    runEventIdempotently(db, currentEvent, tx => {
      tx.create(effectRef, { executions: 1, createdAt: new Date().toISOString() });
    }),
  ]);

  const ledger = await db.collection('processedEvents').doc(currentEvent.id).get();
  const effect = await effectRef.get();

  assert.equal(ledger.exists, true);
  assert.equal(effect.exists, true);
  assert.equal(effect.data()?.executions, 1);
});

test('event idempotency: repeated delivery becomes a durable no-op', async () => {
  requireEmulator();
  const db = getAdminDb();
  const currentEvent = event('conexa-service-closed-idempotency-2');
  const effectRef = db.collection('idempotencyTestEffects').doc('service-idempotency-test-2');

  const first = await runEventIdempotently(db, currentEvent, tx => {
    tx.create(effectRef, { executions: 1, createdAt: new Date().toISOString() });
  });
  const second = await runEventIdempotently(db, currentEvent, tx => {
    tx.create(effectRef, { executions: 2, createdAt: new Date().toISOString() });
  });

  assert.equal(first, 'PROCESSED');
  assert.equal(second, 'ALREADY_PROCESSED');
  assert.equal((await effectRef.get()).data()?.executions, 1);
  assert.equal((await db.collection('processedEvents').doc(currentEvent.id).get()).exists, true);
});

test('event idempotency: failed effect does not leave a false processed ledger', async () => {
  requireEmulator();
  const db = getAdminDb();
  const currentEvent = event('conexa-service-closed-idempotency-3');
  const ledgerRef = db.collection('processedEvents').doc(currentEvent.id);

  await assert.rejects(
    runEventIdempotently(db, currentEvent, () => {
      throw new Error('EFFECT_FAILED');
    }),
    /EFFECT_FAILED/,
  );

  assert.equal((await ledgerRef.get()).exists, false);
});

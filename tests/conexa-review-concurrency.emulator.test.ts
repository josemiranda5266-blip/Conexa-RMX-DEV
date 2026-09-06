import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAdminDb } from '../src/server/firebaseAdmin.js';
import { saveProfessionalReview, reviewIdForService } from '../src/server/reviewService.js';

const TEST_PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || '';

function requireEmulator(): void {
  assert.ok(
    process.env.NODE_ENV === 'test',
    'NODE_ENV=test is required for the Firestore emulator integration suite',
  );
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

const reviewInput = {
  professionalId: 'professional-concurrency-test',
  serviceRequestId: 'service-concurrency-test',
  overallRating: 5,
  qualityRating: 5,
  punctualityRating: 5,
  treatmentRating: 5,
  priceRating: 4,
  complianceRating: 5,
  comment: 'Prueba de concurrencia',
};

test('CONEXA review: two concurrent writes converge to one review', async () => {
  requireEmulator();

  const db = getAdminDb();
  const requestRef = db.collection('service_requests').doc(reviewInput.serviceRequestId);
  const clientRef = db.collection('users').doc('client-concurrency-test');
  const professionalRef = db.collection('users').doc(reviewInput.professionalId);
  const transactionRef = db.collection('transactions').doc('transaction-concurrency-test');
  const reviewRef = db.collection('reviews').doc(
    reviewIdForService(
      'client-concurrency-test',
      reviewInput.professionalId,
      reviewInput.serviceRequestId,
    ),
  );

  await Promise.all([
    requestRef.set({
      id: reviewInput.serviceRequestId,
      clientId: 'client-concurrency-test',
      assignedProfessionalId: reviewInput.professionalId,
      status: 'REVIEW_PENDING',
    }),
    clientRef.set({ id: 'client-concurrency-test', name: 'Cliente Test', isBlocked: false }),
    professionalRef.set({
      id: reviewInput.professionalId,
      name: 'Profesional Test',
      isBlocked: false,
      rating: 0,
      reviewCount: 0,
    }),
    transactionRef.set({
      id: transactionRef.id,
      serviceRequestId: reviewInput.serviceRequestId,
      status: 'SERVICE_COMPLETED',
    }),
  ]);

  const [first, second] = await Promise.all([
    saveProfessionalReview('client-concurrency-test', reviewInput),
    saveProfessionalReview('client-concurrency-test', reviewInput),
  ]);

  assert.equal((await db.collection('reviews').where('serviceRequestId', '==', reviewInput.serviceRequestId).get()).size, 1);
  assert.equal((await professionalRef.get()).data()?.reviewCount, 1);
  assert.equal((await transactionRef.get()).data()?.status, 'SETTLED');
  assert.equal((await requestRef.get()).data()?.status, 'REVIEW_PENDING');
  assert.equal(first.review.id, reviewRef.id);
  assert.equal(second.review.id, reviewRef.id);
});

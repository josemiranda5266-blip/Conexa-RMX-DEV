import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAdminDb } from '../src/server/firebaseAdmin.js';
import { saveProfessionalReview, reviewIdForService } from '../src/server/reviewService.js';

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

async function seedBase(serviceRequestId: string, professionalId: string, clientId: string, transactionId: string, status: string) {
  const db = getAdminDb();
  await Promise.all([
    db.collection('service_requests').doc(serviceRequestId).set({
      id: serviceRequestId,
      clientId,
      assignedProfessionalId: professionalId,
      status,
    }),
    db.collection('users').doc(clientId).set({ id: clientId, name: 'Cliente Test', isBlocked: false }),
    db.collection('users').doc(professionalId).set({
      id: professionalId,
      name: 'Profesional Test',
      isBlocked: false,
      rating: 0,
      reviewCount: 0,
    }),
    db.collection('transactions').doc(transactionId).set({
      id: transactionId,
      serviceRequestId,
      status: 'SERVICE_COMPLETED',
    }),
  ]);
}

async function seedExistingReview(serviceRequestId: string, professionalId: string, clientId: string, transactionId: string, status: string) {
  const db = getAdminDb();
  const reviewId = reviewIdForService(clientId, professionalId, serviceRequestId);
  await seedBase(serviceRequestId, professionalId, clientId, transactionId, status);
  await db.collection('reviews').doc(reviewId).set({
    id: reviewId,
    jobId: serviceRequestId,
    serviceRequestId,
    authorId: clientId,
    clientId,
    clientName: 'Cliente Test',
    clientAvatar: '',
    professionalId,
    comment: 'Reseña previamente persistida',
    overallRating: 5,
    qualityRating: 5,
    punctualityRating: 5,
    treatmentRating: 5,
    priceRating: 4,
    complianceRating: 5,
    isVerifiedJob: true,
    isReported: false,
    createdAt: new Date().toISOString(),
  });
  return reviewId;
}

test('CONEXA review: concurrent writes converge to one review and atomically close service', async () => {
  requireEmulator();
  const db = getAdminDb();
  const requestRef = db.collection('service_requests').doc(reviewInput.serviceRequestId);
  const professionalRef = db.collection('users').doc(reviewInput.professionalId);
  const transactionRef = db.collection('transactions').doc('transaction-concurrency-test');
  const reviewRef = db.collection('reviews').doc(
    reviewIdForService('client-concurrency-test', reviewInput.professionalId, reviewInput.serviceRequestId),
  );

  await seedBase(reviewInput.serviceRequestId, reviewInput.professionalId, 'client-concurrency-test', 'transaction-concurrency-test', 'REVIEW_PENDING');

  const [first, second] = await Promise.all([
    saveProfessionalReview('client-concurrency-test', reviewInput),
    saveProfessionalReview('client-concurrency-test', reviewInput),
  ]);

  assert.equal((await db.collection('reviews').where('serviceRequestId', '==', reviewInput.serviceRequestId).get()).size, 1);
  assert.equal((await professionalRef.get()).data()?.reviewCount, 1);
  assert.equal((await transactionRef.get()).data()?.status, 'SETTLED');
  assert.equal((await transactionRef.get()).data()?.settlementReason, 'REVIEW_COMPLETED');
  assert.equal((await requestRef.get()).data()?.status, 'CLOSED');
  assert.equal(first.review.id, reviewRef.id);
  assert.equal(second.review.id, reviewRef.id);

  const retry = await saveProfessionalReview('client-concurrency-test', reviewInput);
  assert.equal(retry.created, false);
  assert.equal(retry.review.id, reviewRef.id);
  assert.equal((await professionalRef.get()).data()?.reviewCount, 1);
  assert.equal((await transactionRef.get()).data()?.status, 'SETTLED');
  assert.equal((await requestRef.get()).data()?.status, 'CLOSED');
});

test('CONEXA review: existing review plus REVIEW_PENDING repairs interrupted settlement and closes atomically', async () => {
  requireEmulator();
  const db = getAdminDb();
  const serviceRequestId = 'service-review-existing-test';
  const clientId = 'client-review-existing-test';
  const professionalId = 'professional-review-existing-test';
  const transactionId = 'transaction-review-existing-test';
  const reviewId = await seedExistingReview(serviceRequestId, professionalId, clientId, transactionId, 'REVIEW_PENDING');

  const result = await saveProfessionalReview(clientId, { ...reviewInput, professionalId, serviceRequestId });

  assert.equal(result.created, false);
  assert.equal(result.review.id, reviewId);
  assert.equal((await db.collection('service_requests').doc(serviceRequestId).get()).data()?.status, 'CLOSED');
  assert.equal((await db.collection('transactions').doc(transactionId).get()).data()?.status, 'SETTLED');
  assert.equal((await db.collection('transactions').doc(transactionId).get()).data()?.settlementReason, 'REVIEW_COMPLETED');
  assert.equal((await db.collection('users').doc(professionalId).get()).data()?.reviewCount, 0);
});

test('CONEXA review: CLOSED with existing review is a safe no-op under concurrent retries', async () => {
  requireEmulator();
  const db = getAdminDb();
  const serviceRequestId = 'service-closed-idempotent-test';
  const professionalId = 'professional-closed-idempotent-test';
  const clientId = 'client-closed-idempotent-test';
  const transactionId = 'transaction-closed-idempotent-test';
  const reviewId = await seedExistingReview(serviceRequestId, professionalId, clientId, transactionId, 'CLOSED');
  await db.collection('transactions').doc(transactionId).update({ status: 'SETTLED', settlementReason: 'REVIEW_COMPLETED' });

  const [first, second] = await Promise.all([
    saveProfessionalReview(clientId, { ...reviewInput, professionalId, serviceRequestId }),
    saveProfessionalReview(clientId, { ...reviewInput, professionalId, serviceRequestId }),
  ]);

  assert.equal(first.created, false);
  assert.equal(second.created, false);
  assert.equal(first.review.id, reviewId);
  assert.equal(second.review.id, reviewId);
  assert.equal((await db.collection('reviews').where('serviceRequestId', '==', serviceRequestId).get()).size, 1);
  assert.equal((await db.collection('users').doc(professionalId).get()).data()?.reviewCount, 0);
  assert.equal((await db.collection('transactions').doc(transactionId).get()).data()?.status, 'SETTLED');
  assert.equal((await db.collection('service_requests').doc(serviceRequestId).get()).data()?.status, 'CLOSED');
});

test('CONEXA review: two concurrent retries against an existing pending review produce one terminal close', async () => {
  requireEmulator();
  const db = getAdminDb();
  const serviceRequestId = 'service-double-retry-test';
  const professionalId = 'professional-double-retry-test';
  const clientId = 'client-double-retry-test';
  const transactionId = 'transaction-double-retry-test';
  const reviewId = await seedExistingReview(serviceRequestId, professionalId, clientId, transactionId, 'REVIEW_PENDING');

  const [first, second] = await Promise.all([
    saveProfessionalReview(clientId, { ...reviewInput, professionalId, serviceRequestId }),
    saveProfessionalReview(clientId, { ...reviewInput, professionalId, serviceRequestId }),
  ]);

  assert.equal(first.created, false);
  assert.equal(second.created, false);
  assert.equal(first.review.id, reviewId);
  assert.equal(second.review.id, reviewId);
  assert.equal((await db.collection('reviews').where('serviceRequestId', '==', serviceRequestId).get()).size, 1);
  assert.equal((await db.collection('service_requests').doc(serviceRequestId).get()).data()?.status, 'CLOSED');
  assert.equal((await db.collection('transactions').doc(transactionId).get()).data()?.status, 'SETTLED');
  assert.equal((await db.collection('transactions').doc(transactionId).get()).data()?.settlementReason, 'REVIEW_COMPLETED');
  assert.equal((await db.collection('users').doc(professionalId).get()).data()?.reviewCount, 0);
});

test('CONEXA review: CLOSED without review is rejected instead of silently repaired', async () => {
  requireEmulator();
  const db = getAdminDb();
  const serviceRequestId = 'service-closed-anomaly-test';
  const professionalId = 'professional-closed-anomaly-test';
  const clientId = 'client-closed-anomaly-test';
  const transactionId = 'transaction-closed-anomaly-test';

  await seedBase(serviceRequestId, professionalId, clientId, transactionId, 'CLOSED');

  await assert.rejects(
    saveProfessionalReview(clientId, { ...reviewInput, professionalId, serviceRequestId }),
    /REVIEW_SERVICE_NOT_COMPLETED/,
  );

  assert.equal((await db.collection('reviews').where('serviceRequestId', '==', serviceRequestId).get()).size, 0);
  assert.equal((await db.collection('service_requests').doc(serviceRequestId).get()).data()?.status, 'CLOSED');
  assert.equal((await db.collection('transactions').doc(transactionId).get()).data()?.status, 'SERVICE_COMPLETED');
});

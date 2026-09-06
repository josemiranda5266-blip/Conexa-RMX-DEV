import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  canTransition,
  getAllowedJobActions,
  transitionJob,
} from '../src/domain/jobStateMachine.ts';
import {
  assertReviewEligible,
  normalizeReviewWrite,
} from '../src/server/reviewPolicy.ts';
import type { ServiceRequest } from '../src/types.ts';

function makeRequest(status: ServiceRequest['status']): ServiceRequest {
  return {
    id: 'job-1',
    clientId: 'client-1',
    clientName: 'Cliente',
    clientAvatar: '',
    title: 'Servicio de prueba',
    category: 'test',
    professionName: 'Profesional',
    description: 'Prueba de ciclo de cierre',
    approxLocation: 'Santiago del Estero',
    preferredDate: '2026-09-06',
    preferredTimeSlot: '10:00',
    urgency: 'NORMAL',
    status,
    createdAt: '2026-09-06T00:00:00.000Z',
    quotesCount: 1,
    assignedProfessionalId: 'professional-1',
  };
}

describe('CONEXA service closure — pure lifecycle guards', () => {
  test('REVIEW_PENDING can transition only through CLOSE_JOB to CLOSED', () => {
    assert.equal(canTransition('REVIEW_PENDING', 'CLOSE_JOB'), true);
    assert.equal(transitionJob('REVIEW_PENDING', 'CLOSE_JOB'), 'CLOSED');
    assert.ok(getAllowedJobActions('REVIEW_PENDING').includes('CLOSE_JOB'));
  });

  test('CLOSED is terminal with respect to the current state machine', () => {
    assert.deepEqual(getAllowedJobActions('CLOSED'), []);
    assert.equal(canTransition('CLOSED', 'CLOSE_JOB'), false);
    assert.throws(
      () => transitionJob('CLOSED', 'CLOSE_JOB'),
      /INVALID_JOB_TRANSITION:CLOSED:CLOSE_JOB/,
    );
  });

  test('review eligibility accepts COMPLETED for legacy compatibility', () => {
    assert.doesNotThrow(() =>
      assertReviewEligible(makeRequest('COMPLETED'), 'client-1', 'professional-1'),
    );
  });

  test('review eligibility accepts canonical REVIEW_PENDING', () => {
    assert.doesNotThrow(() =>
      assertReviewEligible(makeRequest('REVIEW_PENDING'), 'client-1', 'professional-1'),
    );
  });

  test('review eligibility rejects CLOSED instead of silently reopening it', () => {
    assert.throws(
      () => assertReviewEligible(makeRequest('CLOSED'), 'client-1', 'professional-1'),
      /REVIEW_SERVICE_NOT_COMPLETED/,
    );
  });

  test('review eligibility rejects client and professional mismatches', () => {
    assert.throws(
      () => assertReviewEligible(makeRequest('REVIEW_PENDING'), 'other-client', 'professional-1'),
      /REVIEW_CLIENT_MISMATCH/,
    );
    assert.throws(
      () => assertReviewEligible(makeRequest('REVIEW_PENDING'), 'client-1', 'other-professional'),
      /REVIEW_PROFESSIONAL_MISMATCH/,
    );
  });

  test('review normalization trims identifiers/comment and rounds ratings', () => {
    const normalized = normalizeReviewWrite({
      professionalId: ' professional-1 ',
      serviceRequestId: ' job-1 ',
      overallRating: 4.26,
      qualityRating: 5,
      punctualityRating: 4.04,
      treatmentRating: 3.99,
      priceRating: 4.5,
      complianceRating: 2.74,
      comment: '  Servicio correcto  ',
    });

    assert.equal(normalized.professionalId, 'professional-1');
    assert.equal(normalized.serviceRequestId, 'job-1');
    assert.equal(normalized.overallRating, 4.3);
    assert.equal(normalized.punctualityRating, 4);
    assert.equal(normalized.treatmentRating, 4);
    assert.equal(normalized.complianceRating, 2.7);
    assert.equal(normalized.comment, 'Servicio correcto');
  });

  test('review normalization rejects out-of-range ratings and invalid comments', () => {
    const base = {
      professionalId: 'professional-1',
      serviceRequestId: 'job-1',
      overallRating: 5,
      qualityRating: 5,
      punctualityRating: 5,
      treatmentRating: 5,
      priceRating: 5,
      complianceRating: 5,
      comment: 'ok',
    };

    assert.throws(
      () => normalizeReviewWrite({ ...base, overallRating: 5.1 }),
      /INVALID_REVIEW_RATING/,
    );
    assert.throws(
      () => normalizeReviewWrite({ ...base, comment: '   ' }),
      /INVALID_REVIEW_COMMENT/,
    );
  });
});

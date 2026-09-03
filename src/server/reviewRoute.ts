import type { Request, Response } from 'express';
import { verifyAuthToken } from './auth.js';
import { saveProfessionalReview } from './reviewService.js';

function readRating(value: unknown): number {
  return Number(value);
}

export async function handleProfessionalReviewSave(req: Request, res: Response): Promise<void> {
  try {
    const auth = await verifyAuthToken(req);
    if (!auth.isAuthenticated) {
      res.status(401).json({ error: auth.errorReason });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const input = {
      professionalId: typeof body.professionalId === 'string' ? body.professionalId : '',
      serviceRequestId: typeof body.serviceRequestId === 'string'
        ? body.serviceRequestId
        : typeof body.jobId === 'string'
          ? body.jobId
          : '',
      overallRating: readRating(body.overallRating),
      qualityRating: readRating(body.qualityRating),
      punctualityRating: readRating(body.punctualityRating),
      treatmentRating: readRating(body.treatmentRating),
      priceRating: readRating(body.priceRating),
      complianceRating: readRating(body.complianceRating),
      comment: typeof body.comment === 'string' ? body.comment : '',
    };

    const result = await saveProfessionalReview(auth.userId, input);
    res.status(result.created ? 201 : 200).json(result);
  } catch (error: any) {
    const code = typeof error?.message === 'string' ? error.message : 'REVIEW_SAVE_FAILED';
    const status =
      code.startsWith('INVALID_') ? 400 :
      code === 'SERVICE_REQUEST_NOT_FOUND' || code === 'USER_NOT_FOUND' ? 404 :
      code === 'USER_BLOCKED' ? 403 :
      code.includes('MISMATCH') || code === 'REVIEW_SERVICE_NOT_COMPLETED' ? 409 :
      500;

    console.error('[REVIEWS] Error guardando reseña:', code);
    res.status(status).json({ error: code });
  }
}

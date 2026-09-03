import type { Request, Response } from 'express';
import { verifyAuthToken } from '../auth.js';
import { createServiceRequestFromRadarOpportunity } from './radarOpportunityConversionService.js';

export async function handleRadarOpportunityConversion(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const auth = await verifyAuthToken(req);
    if (!auth.isAuthenticated) {
      res.status(401).json({ error: auth.errorReason });
      return;
    }

    const opportunityId = String(req.params.opportunityId || '').trim();
    if (!opportunityId) {
      res.status(400).json({ error: 'INVALID_RADAR_OPPORTUNITY_ID' });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const professionalId = typeof body.professionalId === 'string'
      ? body.professionalId.trim()
      : undefined;
    const preferredDate = typeof body.preferredDate === 'string'
      ? body.preferredDate.trim()
      : undefined;
    const preferredTimeSlot = typeof body.preferredTimeSlot === 'string'
      ? body.preferredTimeSlot.trim()
      : undefined;

    const result = await createServiceRequestFromRadarOpportunity({
      opportunityId,
      clientUserId: auth.userId,
      professionalId,
      preferredDate,
      preferredTimeSlot,
    });

    res.status(result.created ? 201 : 200).json(result);
  } catch (error: any) {
    const code = typeof error?.message === 'string' ? error.message : 'RADAR_CONVERSION_FAILED';

    const status =
      code.startsWith('INVALID_') ? 400 :
      code.includes('NOT_FOUND') ? 404 :
      code.includes('CLIENT_MISMATCH') ||
      code.includes('CLIENT_BLOCKED') ||
      code.includes('NOT_CONVERTIBLE') ||
      code.includes('NO_MATCHED_PROFESSIONAL') ||
      code.includes('PROFESSIONAL_NOT_FOUND') ||
      code.includes('PROFESSIONAL_BLOCKED') ||
      code.includes('PROFESSIONAL_NOT_VERIFIED') ||
      code.includes('PROFESSIONAL_UNAVAILABLE') ? 409 :
      code.includes('INCONSISTENT') ||
      code.includes('SERVICE_REQUEST_MISSING') ||
      code.includes('COLLISION') ? 500 :
      500;

    console.error('[RADAR] Error convirtiendo oportunidad en ServiceRequest:', code);
    res.status(status).json({ error: code });
  }
}

import type { Request, Response } from 'express';
import { verifyUserAuthToken } from '../auth.js';
import { createServiceRequestFromRadarOpportunity } from './radarOpportunityConversionService.js';

export async function handleRadarOpportunityConversion(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = await verifyUserAuthToken(req);
    if (!user?.uid) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    const opportunityId = String(req.params.opportunityId || '').trim();
    if (!opportunityId) {
      res.status(400).json({ error: 'ID de oportunidad requerido' });
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
      clientUserId: user.uid,
      professionalId,
      preferredDate,
      preferredTimeSlot,
    });

    res.status(result.created ? 201 : 200).json(result);
  } catch (error: any) {
    const code = typeof error?.message === 'string' ? error.message : 'RADAR_CONVERSION_FAILED';

    const status =
      code === 'No autenticado' ? 401 :
      code.includes('NOT_FOUND') ? 404 :
      code.includes('CLIENT_MISMATCH') ||
      code.includes('CLIENT_BLOCKED') ||
      code.includes('NOT_CONVERTIBLE') ||
      code.includes('NO_MATCHED_PROFESSIONAL') ||
      code.includes('PROFESSIONAL_NOT_FOUND') ||
      code.includes('PROFESSIONAL_BLOCKED') ||
      code.includes('PROFESSIONAL_NOT_VERIFIED') ||
      code.includes('PROFESSIONAL_UNAVAILABLE') ? 409 :
      code.includes('INVALID_') ? 400 :
      code.includes('INCONSISTENT') ||
      code.includes('SERVICE_REQUEST_MISSING') ||
      code.includes('COLLISION') ? 500 :
      500;

    console.error('[RADAR] Error convirtiendo oportunidad en ServiceRequest:', code);
    res.status(status).json({ error: code });
  }
}

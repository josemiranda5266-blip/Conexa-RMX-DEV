import type { Request, Response } from 'express';
import { verifyAuthToken } from './auth.js';
import { saveProfessionalProfile } from './professionalProfileService.js';

export async function handleProfessionalProfileSave(req: Request, res: Response): Promise<void> {
  try {
    const auth = await verifyAuthToken(req);
    if (!auth.isAuthenticated) {
      res.status(401).json({ error: auth.errorReason });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const input = {
      professionId: typeof body.professionId === 'string' ? body.professionId : undefined,
      professionName: typeof body.professionName === 'string' ? body.professionName : '',
      businessName: typeof body.businessName === 'string' ? body.businessName : undefined,
      specialties: Array.isArray(body.specialties)
        ? body.specialties
        : typeof body.specialtiesText === 'string'
          ? body.specialtiesText.split(',')
          : [],
      description: typeof body.description === 'string' ? body.description : undefined,
      workZoneRadiusKm: Number(body.workZoneRadiusKm),
      workingHours: typeof body.workingHours === 'string'
        ? body.workingHours
        : typeof body.workHours === 'string'
          ? body.workHours
          : '',
      matriculaOrDegree: typeof body.matriculaOrDegree === 'string' ? body.matriculaOrDegree : undefined,
      hourlyRateArs: Number(body.hourlyRateArs),
      servicesOffered: Array.isArray(body.servicesOffered) ? body.servicesOffered : [],
      portfolioImages: Array.isArray(body.portfolioImages) ? body.portfolioImages : [],
    };

    const result = await saveProfessionalProfile(auth.userId, input);
    res.status(200).json(result);
  } catch (error: any) {
    const code = typeof error?.message === 'string' ? error.message : 'PROFESSIONAL_PROFILE_SAVE_FAILED';
    const status =
      code.includes('REQUIRED') ||
      code.startsWith('INVALID_') ||
      code.includes('MISMATCH') ? 400 :
      code === 'USER_NOT_FOUND' ? 404 :
      code === 'USER_BLOCKED' ? 409 :
      500;

    console.error('[PROFESSIONAL_PROFILE] Error guardando perfil:', code);
    res.status(status).json({ error: code });
  }
}

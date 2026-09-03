import type { Request, Response } from 'express';
import { verifyAuthToken } from '../auth.js';
import { matchRadarOpportunity } from './radarOpportunityMatchingService.js';

export async function handleRadarMatch(req: Request, res: Response): Promise<void> {
  try {
    const auth = await verifyAuthToken(req);
    if (!auth.isAuthenticated) {
      res.status(401).json({ error: auth.errorReason });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const opportunity = {
      category: typeof body.category === 'string' ? body.category.trim() : '',
      subcategory: typeof body.subcategory === 'string' ? body.subcategory.trim() : '',
      city: typeof body.city === 'string' ? body.city.trim() : '',
      province: typeof body.province === 'string' ? body.province.trim() : '',
      neighborhood: typeof body.neighborhood === 'string' ? body.neighborhood.trim() : undefined,
    };

    if (!opportunity.category || !opportunity.city || !opportunity.province) {
      res.status(400).json({ error: 'INVALID_RADAR_MATCH_INPUT' });
      return;
    }

    const rawLimit = Number(body.limit);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 50) : 10;
    const result = await matchRadarOpportunity(opportunity, limit);

    res.status(200).json(result);
  } catch (error: any) {
    const code = typeof error?.message === 'string' ? error.message : 'RADAR_MATCH_FAILED';
    console.error('[RADAR] Error ejecutando matching:', code);
    res.status(code.startsWith('INVALID_') ? 400 : 500).json({ error: code });
  }
}

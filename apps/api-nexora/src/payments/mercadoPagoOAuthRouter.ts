import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import { buildMercadoPagoAuthorizationUrl, consumeAndValidateOAuthState, exchangeMercadoPagoCode, saveMercadoPagoOAuthCodeExchange } from './mercadoPagoOAuth.js';

export const mercadoPagoOAuthRouter = Router();

mercadoPagoOAuthRouter.get('/api/mercadopago/oauth/start', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const merchantId = req.userId!;
    const authorizationUrl = await buildMercadoPagoAuthorizationUrl(merchantId);
    return res.redirect(302, authorizationUrl);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (code === 'MERCADO_PAGO_OAUTH_CONFIG_INCOMPLETE') return res.status(503).json({ error: code });
    if (code.startsWith('MERCADO_PAGO_')) return res.status(400).json({ error: code });
    return res.status(500).json({ error: 'Unable to start Mercado Pago OAuth' });
  }
});

mercadoPagoOAuthRouter.get('/api/mercadopago/oauth/callback', async (req, res) => {
  try {
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const merchantId = await consumeAndValidateOAuthState(state);
    const token = await exchangeMercadoPagoCode(code);
    await saveMercadoPagoOAuthCodeExchange(merchantId, token);
    const appUrl = process.env.APP_URL?.trim();
    if (!appUrl) return res.status(503).json({ error: 'APP_URL_REQUIRED' });
    return res.redirect(302, `${appUrl.replace(/\/$/, '')}/payment/connected`);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (['OAUTH_STATE_INVALID', 'OAUTH_STATE_EXPIRED', 'OAUTH_STATE_NOT_FOUND', 'OAUTH_STATE_MERCHANT_MISMATCH', 'MP_OAUTH_CODE_REQUIRED'].includes(code)) return res.status(400).json({ error: code });
    if (code.startsWith('MP_OAUTH_') || code.startsWith('MERCADO_PAGO_OAUTH_')) return res.status(502).json({ error: code });
    return res.status(500).json({ error: 'Unable to complete Mercado Pago OAuth' });
  }
});

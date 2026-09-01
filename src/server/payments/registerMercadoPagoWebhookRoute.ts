import { Router } from 'express';
import { handleMercadoPagoWebhook } from './mercadoPagoWebhook.js';

/**
 * Registers the Mercado Pago webhook route without coupling the payment domain
 * to the application's server bootstrap.
 *
 * Mount from the main server with:
 *   app.use(registerMercadoPagoWebhookRoute());
 */
export function registerMercadoPagoWebhookRoute(): Router {
  const router = Router();
  router.post('/api/mercadopago/webhook', handleMercadoPagoWebhook);
  return router;
}

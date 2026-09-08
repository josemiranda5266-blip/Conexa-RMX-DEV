/**
 * Temporary compatibility boundary for the Mercado Pago/chargeback migration.
 * New Nexora HTTP code must import this module instead of reaching into
 * `src/server` directly. The implementation behind this boundary is still
 * legacy and will be migrated in the next payment phase.
 */
export { chargebackAdminRouter } from '../../../../src/server/payments/chargebackAdminRouter.js';
export { handleMercadoPagoWebhook } from '../../../../src/server/payments/mercadoPagoWebhook.js';

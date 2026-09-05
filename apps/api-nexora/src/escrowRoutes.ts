import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from './auth.js';
import { confirmDelivery, expireAndReleaseEligibleEscrows, getEscrowForOrder, openEscrowDispute } from './escrowService.js';

export const escrowRouter = Router();

escrowRouter.get('/api/orders/:id/escrow', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const escrow = await getEscrowForOrder(req.params.id);
    if (!escrow) return res.status(404).json({ error: 'ESCROW_NOT_FOUND' });
    if (escrow.buyerId !== req.userId && escrow.sellerId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    return res.json(escrow);
  } catch {
    return res.status(500).json({ error: 'Unable to load escrow' });
  }
});

escrowRouter.post('/api/orders/:id/confirm-delivery', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const escrow = await confirmDelivery(req.params.id, req.userId!);
    return res.json({ success: true, escrow });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (code === 'ESCROW_NOT_FOUND') return res.status(404).json({ error: code });
    if (code === 'FORBIDDEN') return res.status(403).json({ error: code });
    if (['ORDER_NOT_READY_FOR_RELEASE', 'INVALID_ORDER_STATE'].includes(code)) return res.status(409).json({ error: code });
    return res.status(500).json({ error: 'Unable to confirm delivery' });
  }
});

escrowRouter.post('/api/orders/:id/dispute', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason) return res.status(400).json({ error: 'DISPUTE_REASON_REQUIRED' });
    if (reason.length > 1000) return res.status(400).json({ error: 'DISPUTE_REASON_TOO_LONG' });
    const escrow = await openEscrowDispute(req.params.id, req.userId!, reason);
    return res.status(202).json({ success: true, escrow });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (code === 'ESCROW_NOT_FOUND') return res.status(404).json({ error: code });
    if (code === 'FORBIDDEN') return res.status(403).json({ error: code });
    if (['DISPUTE_REASON_REQUIRED'].includes(code)) return res.status(400).json({ error: code });
    if (['INVALID_ORDER_STATE'].includes(code)) return res.status(409).json({ error: code });
    return res.status(500).json({ error: 'Unable to open dispute' });
  }
});

export function startEscrowAutoReleaseWorker(intervalMs = 15 * 60_000): NodeJS.Timeout {
  const run = async () => {
    try {
      const result = await expireAndReleaseEligibleEscrows();
      if (result.scanned > 0) console.log(`[ESCROW] auto-release scanned=${result.scanned} released=${result.released}`);
    } catch (error) {
      console.error('[ESCROW] auto-release worker failed:', error);
    }
  };
  void run();
  return setInterval(run, intervalMs);
}

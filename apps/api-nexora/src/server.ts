import express from 'express';
import { requireAuth, type AuthenticatedRequest } from './auth.js';
import { conversationRepository, listingRepository, orderRepository, reviewRepository, shopRepository } from './repositories.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, domain: 'NEXORA', persistence: 'firestore' }));

app.get('/api/listings', async (req, res) => {
  try { res.json(await listingRepository.list(Number(req.query.limit) || 50)); }
  catch { res.status(500).json({ error: 'Unable to load listings' }); }
});

app.get('/api/listings/:id', async (req, res) => {
  try { const item = await listingRepository.get(req.params.id); return item ? res.json(item) : res.status(404).json({ error: 'Listing not found' }); }
  catch { return res.status(500).json({ error: 'Unable to load listing' }); }
});

app.get('/api/shops', async (req, res) => {
  try { res.json(await shopRepository.list(Number(req.query.limit) || 50)); }
  catch { res.status(500).json({ error: 'Unable to load shops' }); }
});

app.get('/api/shops/:id', async (req, res) => {
  try { const shop = await shopRepository.get(req.params.id); return shop ? res.json(shop) : res.status(404).json({ error: 'Shop not found' }); }
  catch { return res.status(500).json({ error: 'Unable to load shop' }); }
});

app.get('/api/orders', requireAuth, async (req: AuthenticatedRequest, res) => {
  try { res.json(await orderRepository.listForUser(req.userId!)); }
  catch { res.status(500).json({ error: 'Unable to load orders' }); }
});

app.get('/api/orders/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const order = await orderRepository.get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.buyerId !== req.userId && order.sellerId !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    return res.json(order);
  } catch { return res.status(500).json({ error: 'Unable to load order' }); }
});

app.post('/api/orders', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body as any;
    if (body.buyerId && body.buyerId !== req.userId) return res.status(403).json({ error: 'buyerId must match authenticated user' });
    if (!body.sellerId || !Array.isArray(body.items) || body.items.length === 0 || !Number.isFinite(body.totalAmount) || body.totalAmount <= 0) return res.status(400).json({ error: 'Invalid order' });
    const order = await orderRepository.create({ buyerId: req.userId!, sellerId: String(body.sellerId), items: body.items, totalAmount: body.totalAmount, currency: 'ARS', status: 'PENDING', requiresInstallation: body.requiresInstallation === true, createdAt: new Date().toISOString() });
    return res.status(201).json(order);
  } catch { return res.status(500).json({ error: 'Unable to create order' }); }
});

app.post('/api/orders/:id/complete', requireAuth, async (req: AuthenticatedRequest, res) => {
  try { const result = await orderRepository.complete(req.params.id, req.userId!); return res.json(result); }
  catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (code === 'ORDER_NOT_FOUND') return res.status(404).json({ error: 'Order not found' });
    if (code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
    if (code === 'INVALID_ORDER_STATE') return res.status(409).json({ error: 'Order cannot be completed from its current state' });
    return res.status(500).json({ error: 'Unable to complete order' });
  }
});

app.post('/api/reviews', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body as any;
    if (body.buyerId && body.buyerId !== req.userId) return res.status(403).json({ error: 'buyerId must match authenticated user' });
    const rating = Number(body.rating);
    if (!body.sellerId || !Number.isFinite(rating) || rating < 1 || rating > 5 || typeof body.comment !== 'string') return res.status(400).json({ error: 'Invalid review' });
    const review = await reviewRepository.create({ buyerId: req.userId!, sellerId: String(body.sellerId), listingId: body.listingId ? String(body.listingId) : undefined, rating, comment: body.comment.trim().slice(0, 2000), date: new Date().toISOString(), verifiedPurchase: body.verifiedPurchase === true });
    return res.status(201).json(review);
  } catch { return res.status(500).json({ error: 'Unable to create review' }); }
});

app.get('/api/conversations', requireAuth, async (req: AuthenticatedRequest, res) => {
  try { res.json(await conversationRepository.listForUser(req.userId!)); }
  catch { res.status(500).json({ error: 'Unable to load conversations' }); }
});

/** Compatibility endpoint. Completion now happens through /api/orders/:id/complete and an outbox record. */
app.post('/api/orders/completed-event', requireAuth, (_req, res) => res.status(410).json({ error: 'Use /api/orders/:id/complete' }));

export { app };

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT ?? 4102);
  app.listen(port, () => console.log(`Nexora API listening on ${port}`));
}

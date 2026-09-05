import express from 'express';
import { requireAuth, type AuthenticatedRequest } from './auth.js';
import { conversationRepository, listingRepository, orderRepository, reviewRepository, shopRepository } from './repositories.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const parseLimit = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.floor(parsed), 1), 100) : 50;
};

app.get('/api/health', (_req, res) => res.json({ ok: true, domain: 'NEXORA', persistence: 'firestore' }));
app.get('/api/listings', async (req, res) => { try { res.json(await listingRepository.list(parseLimit(req.query.limit))); } catch { res.status(500).json({ error: 'Unable to load listings' }); } });
app.get('/api/listings/:id', async (req, res) => { try { const item = await listingRepository.get(req.params.id); return item ? res.json(item) : res.status(404).json({ error: 'Listing not found' }); } catch { return res.status(500).json({ error: 'Unable to load listing' }); } });
app.get('/api/shops', async (req, res) => { try { res.json(await shopRepository.list(parseLimit(req.query.limit))); } catch { res.status(500).json({ error: 'Unable to load shops' }); } });
app.get('/api/shops/:id', async (req, res) => { try { const shop = await shopRepository.get(req.params.id); return shop ? res.json(shop) : res.status(404).json({ error: 'Shop not found' }); } catch { return res.status(500).json({ error: 'Unable to load shop' }); } });

app.get('/api/orders', requireAuth, async (req: AuthenticatedRequest, res) => { try { res.json(await orderRepository.listForUser(req.userId!)); } catch { res.status(500).json({ error: 'Unable to load orders' }); } });
app.get('/api/orders/:id', requireAuth, async (req: AuthenticatedRequest, res) => { try { const order = await orderRepository.get(req.params.id); if (!order) return res.status(404).json({ error: 'Order not found' }); if (order.buyerId !== req.userId && order.sellerId !== req.userId) return res.status(403).json({ error: 'Forbidden' }); return res.json(order); } catch { return res.status(500).json({ error: 'Unable to load order' }); } });
app.post('/api/orders', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    if (body.buyerId && body.buyerId !== req.userId) return res.status(403).json({ error: 'buyerId must match authenticated user' });
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) return res.status(400).json({ error: 'Invalid order items' });

    const requestedItems = body.items.map(item => {
      const value = item as Record<string, unknown>;
      return { listingId: value.listingId, quantity: value.quantity };
    });
    if (requestedItems.some(item => typeof item.listingId !== 'string' || !item.listingId || !Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 100)) {
      return res.status(400).json({ error: 'Invalid order items' });
    }

    const listingIds = requestedItems.map(item => item.listingId as string);
    if (new Set(listingIds).size !== listingIds.length) return res.status(400).json({ error: 'Duplicate order item' });
    const listings = await Promise.all(listingIds.map(id => listingRepository.get(id)));
    if (listings.some(listing => !listing)) return res.status(404).json({ error: 'Listing not found' });
    const validListings = listings as NonNullable<typeof listings[number]>[];
    if (validListings.some(listing => listing.status !== 'Disponible')) return res.status(409).json({ error: 'Listing not available' });
    const sellerId = validListings[0].sellerId;
    if (!sellerId || sellerId === req.userId) return res.status(400).json({ error: 'Invalid order parties' });
    if (validListings.some(listing => listing.sellerId !== sellerId)) return res.status(409).json({ error: 'Multiple sellers are not supported in one order' });

    // Price, seller and total are server-authoritative. Client values for these fields are ignored.
    const trustedItems = validListings.map((listing, index) => ({
      listingId: listing.id,
      quantity: requestedItems[index].quantity as number,
      unitPrice: listing.price
    }));
    const trustedTotal = Math.round(trustedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 100) / 100;
    if (!Number.isFinite(trustedTotal) || trustedTotal <= 0) return res.status(400).json({ error: 'Invalid order amount' });

    const order = await orderRepository.create({
      buyerId: req.userId!,
      sellerId,
      items: trustedItems,
      totalAmount: trustedTotal,
      currency: 'ARS',
      status: 'PENDING',
      requiresInstallation: body.requiresInstallation === true,
      createdAt: new Date().toISOString()
    });
    return res.status(201).json(order);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN';
    if (code.startsWith('INVALID_ORDER') || code === 'DUPLICATE_ORDER_ITEM') return res.status(400).json({ error: code });
    return res.status(500).json({ error: 'Unable to create order' });
  }
});
app.post('/api/orders/:id/complete', requireAuth, async (req: AuthenticatedRequest, res) => { try { return res.json(await orderRepository.complete(req.params.id, req.userId!)); } catch (error) { const code = error instanceof Error ? error.message : 'UNKNOWN'; if (code === 'ORDER_NOT_FOUND') return res.status(404).json({ error: 'Order not found' }); if (code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' }); if (code === 'INVALID_ORDER_STATE') return res.status(409).json({ error: 'Order cannot be completed from its current state' }); return res.status(500).json({ error: 'Unable to complete order' }); } });

app.post('/api/reviews', requireAuth, async (req: AuthenticatedRequest, res) => { try { const body = req.body as Record<string, unknown>; if (body.buyerId && body.buyerId !== req.userId) return res.status(403).json({ error: 'buyerId must match authenticated user' }); const rating = Number(body.rating); if (typeof body.sellerId !== 'string' || !Number.isFinite(rating) || rating < 1 || rating > 5 || typeof body.comment !== 'string') return res.status(400).json({ error: 'Invalid review' }); const review = await reviewRepository.create({ buyerId: req.userId!, sellerId: body.sellerId, listingId: typeof body.listingId === 'string' ? body.listingId : undefined, rating, comment: body.comment.trim().slice(0, 2000), date: new Date().toISOString() }, req.userId!); return res.status(201).json(review); } catch (error) { const code = error instanceof Error ? error.message : 'UNKNOWN'; if (code === 'PURCHASE_REQUIRED') return res.status(409).json({ error: 'A completed purchase is required to review this seller' }); if (code === 'DUPLICATE_REVIEW') return res.status(409).json({ error: 'Review already exists' }); if (code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' }); return res.status(500).json({ error: 'Unable to create review' }); } });

app.get('/api/conversations', requireAuth, async (req: AuthenticatedRequest, res) => { try { res.json(await conversationRepository.listForUser(req.userId!)); } catch { res.status(500).json({ error: 'Unable to load conversations' }); } });
app.post('/api/conversations', requireAuth, async (req: AuthenticatedRequest, res) => { try { const body = req.body as Record<string, unknown>; if (typeof body.listingId !== 'string' || typeof body.sellerId !== 'string') return res.status(400).json({ error: 'Invalid conversation' }); const conversation = await conversationRepository.create({ listingId: body.listingId, buyerId: req.userId!, sellerId: body.sellerId, stage: 'Consulta', lastMessageText: '', lastMessageTime: new Date().toISOString(), unreadCountBuyer: 0, unreadCountSeller: 0 }, req.userId!); return res.status(201).json(conversation); } catch (error) { const code = error instanceof Error ? error.message : 'UNKNOWN'; if (code === 'FORBIDDEN' || code === 'INVALID_PARTICIPANTS' || code === 'INVALID_SELLER') return res.status(403).json({ error: 'Invalid conversation participants' }); if (code === 'LISTING_NOT_FOUND') return res.status(404).json({ error: 'Listing not found' }); return res.status(500).json({ error: 'Unable to create conversation' }); } });
app.get('/api/conversations/:id/messages', requireAuth, async (req: AuthenticatedRequest, res) => { try { res.json(await conversationRepository.listMessages(req.params.id, req.userId!, parseLimit(req.query.limit))); } catch (error) { const code = error instanceof Error ? error.message : 'UNKNOWN'; if (code === 'CONVERSATION_NOT_FOUND') return res.status(404).json({ error: 'Conversation not found' }); if (code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' }); return res.status(500).json({ error: 'Unable to load messages' }); } });
app.post('/api/conversations/:id/messages', requireAuth, async (req: AuthenticatedRequest, res) => { try { const body = req.body as Record<string, unknown>; if (typeof body.text !== 'string') return res.status(400).json({ error: 'Message text is required' }); return res.status(201).json(await conversationRepository.sendMessage(req.params.id, req.userId!, body.text)); } catch (error) { const code = error instanceof Error ? error.message : 'UNKNOWN'; if (code === 'CONVERSATION_NOT_FOUND') return res.status(404).json({ error: 'Conversation not found' }); if (code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' }); if (code === 'INVALID_MESSAGE') return res.status(400).json({ error: 'Message text is required' }); return res.status(500).json({ error: 'Unable to send message' }); } });

app.post('/api/orders/completed-event', requireAuth, (_req, res) => res.status(410).json({ error: 'Use /api/orders/:id/complete' }));
export { app };
if (process.env.NODE_ENV !== 'test') { const port = Number(process.env.PORT ?? 4102); app.listen(port, () => console.log(`Nexora API listening on ${port}`)); }
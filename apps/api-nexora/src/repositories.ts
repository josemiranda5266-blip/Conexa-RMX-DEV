import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from './firebaseAdmin.js';
import type { Conversation, Listing, Message, NexoraOrder, NexoraReview, PaymentTransaction, Shop } from '@super-app/shared-types';

const now = () => new Date().toISOString();
const RESERVATION_MINUTES = 15;
const db = () => getDb();
const safeLimit = (value: number) => Math.min(Math.max(Number.isFinite(value) ? Math.floor(value) : 50, 1), 100);

function inventoryForListing(listing: Listing, at: string) {
  let stock = Number.isInteger(listing.stock) && Number(listing.stock) >= 0 ? Number(listing.stock) : 1;
  let status = listing.status;
  const expiresAt = listing.reservationExpiresAt ? Date.parse(listing.reservationExpiresAt) : NaN;
  const reservedQuantity = Number.isInteger(listing.reservedQuantity) && Number(listing.reservedQuantity) > 0 ? Number(listing.reservedQuantity) : 0;

  if (status === 'Reservado' && reservedQuantity > 0 && Number.isFinite(expiresAt) && expiresAt <= Date.parse(at)) {
    stock += reservedQuantity;
    status = stock > 0 ? 'Disponible' : 'Vendido';
  }

  return { stock, status, reservedQuantity };
}

function reservationExpiry(from: string): string {
  return new Date(Date.parse(from) + RESERVATION_MINUTES * 60_000).toISOString();
}

export const listingRepository = {
  async list(limit = 50): Promise<Listing[]> {
    const snap = await db().collection('listings').where('status', '==', 'Disponible').limit(safeLimit(limit)).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Listing)).filter(listing => (Number.isInteger(listing.stock) ? Number(listing.stock) > 0 : true));
  },
  async get(id: string): Promise<Listing | null> {
    const d = await db().collection('listings').doc(id).get();
    return d.exists ? ({ id: d.id, ...d.data() } as Listing) : null;
  },
  async create(input: Omit<Listing, 'id'>): Promise<Listing> {
    const ref = db().collection('listings').doc();
    const value = { ...input, stock: Number.isInteger(input.stock) && Number(input.stock) >= 0 ? input.stock : 1, createdAt: input.createdAt || now() };
    await ref.create(value);
    return { id: ref.id, ...value } as Listing;
  }
};

export const shopRepository = {
  async list(limit = 50): Promise<Shop[]> {
    const snap = await db().collection('shops').limit(safeLimit(limit)).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Shop));
  },
  async get(id: string): Promise<Shop | null> {
    const d = await db().collection('shops').doc(id).get();
    return d.exists ? ({ id: d.id, ...d.data() } as Shop) : null;
  }
};

export const orderRepository = {
  async get(id: string): Promise<NexoraOrder | null> {
    const d = await db().collection('orders').doc(id).get();
    return d.exists ? ({ id: d.id, ...d.data() } as NexoraOrder) : null;
  },
  async listForUser(userId: string): Promise<NexoraOrder[]> {
    const [buyerSnap, sellerSnap] = await Promise.all([
      db().collection('orders').where('buyerId', '==', userId).limit(100).get(),
      db().collection('orders').where('sellerId', '==', userId).limit(100).get()
    ]);
    return [...new Map([...buyerSnap.docs, ...sellerSnap.docs].map(d => [d.id, { id: d.id, ...d.data() } as NexoraOrder])).values()];
  },
  async create(input: Omit<NexoraOrder, 'id'>): Promise<NexoraOrder> {
    if (!input.buyerId) throw new Error('INVALID_BUYER');
    if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 50) throw new Error('INVALID_ORDER_ITEMS');

    const listingIds = input.items.map(item => item.listingId);
    if (listingIds.some(id => !id) || new Set(listingIds).size !== listingIds.length) throw new Error('INVALID_ORDER_ITEMS');
    if (input.items.some(item => !Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 100)) throw new Error('INVALID_ORDER_ITEM');

    const orderRef = db().collection('orders').doc();
    const paymentRef = db().collection('paymentTransactions').doc();
    const createdAt = now();
    let value!: NexoraOrder;

    await db().runTransaction(async tx => {
      const listingRefs = listingIds.map(id => db().collection('listings').doc(id));
      const listingSnapshots = await Promise.all(listingRefs.map(ref => tx.get(ref)));
      if (listingSnapshots.some(snapshot => !snapshot.exists)) throw new Error('LISTING_UNAVAILABLE');

      const trustedListings = listingSnapshots.map((snapshot, index) => ({ id: listingIds[index], ...(snapshot.data() as Listing) })) as Listing[];
      const inventory = trustedListings.map(listing => inventoryForListing(listing, createdAt));
      if (inventory.some(item => item.status !== 'Disponible' || item.stock <= 0)) throw new Error('LISTING_UNAVAILABLE');

      const sellerId = trustedListings[0].sellerId;
      if (!sellerId || sellerId === input.buyerId) throw new Error('INVALID_ORDER_PARTIES');
      if (trustedListings.some(listing => listing.sellerId !== sellerId)) throw new Error('MIXED_SELLER_ORDER');

      const trustedItems = input.items.map(item => {
        const index = listingIds.indexOf(item.listingId);
        const listing = trustedListings[index];
        const state = inventory[index];
        if (!Number.isFinite(listing.price) || listing.price <= 0) throw new Error('INVALID_LISTING_PRICE');
        if (item.quantity > state.stock) throw new Error('INSUFFICIENT_STOCK');
        return { listingId: listing.id, quantity: item.quantity, unitPrice: listing.price };
      });
      const trustedTotal = Math.round(trustedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 100) / 100;
      if (!Number.isFinite(trustedTotal) || trustedTotal <= 0) throw new Error('INVALID_ORDER_AMOUNT');

      trustedListings.forEach((listing, index) => {
        const item = trustedItems[index];
        const state = inventory[index];
        const remaining = state.stock - item.quantity;
        tx.update(listingRefs[index], {
          stock: remaining,
          status: 'Reservado',
          reservedQuantity: item.quantity,
          reservedByOrderId: orderRef.id,
          reservationExpiresAt: reservationExpiry(createdAt),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      const requiresInstallation = trustedListings.some(listing => listing.requiresInstallation === true);
      value = {
        id: orderRef.id,
        buyerId: input.buyerId,
        sellerId,
        items: trustedItems,
        totalAmount: trustedTotal,
        currency: 'ARS',
        status: 'PENDING',
        requiresInstallation,
        paymentTransactionId: paymentRef.id,
        createdAt
      };

      const payment: PaymentTransaction = {
        id: paymentRef.id,
        domain: 'NEXORA',
        orderId: orderRef.id,
        buyerId: input.buyerId,
        merchantId: sellerId,
        amountArs: trustedTotal,
        currency: 'ARS',
        status: 'PAYMENT_PENDING',
        provider: 'MERCADO_PAGO',
        createdAt
      };

      const firestoreOrder = { ...value };
      delete (firestoreOrder as { id?: string }).id;
      const firestorePayment = { ...payment };
      delete (firestorePayment as { id?: string }).id;
      tx.create(orderRef, firestoreOrder);
      tx.create(paymentRef, firestorePayment);
    });

    return value;
  },
  async cancel(id: string, actorId: string): Promise<NexoraOrder> {
    const orderRef = db().collection('orders').doc(id);
    let cancelled!: NexoraOrder;
    await db().runTransaction(async tx => {
      const snap = await tx.get(orderRef);
      if (!snap.exists) throw new Error('ORDER_NOT_FOUND');
      const data = snap.data() as NexoraOrder;
      if (data.buyerId !== actorId && data.sellerId !== actorId) throw new Error('FORBIDDEN');
      if (data.status === 'CANCELLED') { cancelled = { id, ...data }; return; }
      if (data.status !== 'PENDING') throw new Error('INVALID_ORDER_STATE');

      const paymentId = String(data.paymentTransactionId || '').trim();
      const paymentRef = paymentId ? db().collection('paymentTransactions').doc(paymentId) : null;
      const paymentSnap = paymentRef ? await tx.get(paymentRef) : null;
      if (paymentSnap?.exists) {
        const paymentStatus = String(paymentSnap.data()?.status || '').toUpperCase();
        if (paymentStatus !== 'PAYMENT_PENDING') throw new Error('INVALID_ORDER_STATE');
      }

      const listingRefs = data.items.map(item => db().collection('listings').doc(item.listingId));
      const listings = await Promise.all(listingRefs.map(ref => tx.get(ref)));
      const cancelledAt = now();
      listings.forEach((snap, index) => {
        if (!snap.exists) return;
        const listing = snap.data() as Listing;
        const owner = String(listing.reservedByOrderId || '').trim();
        if (owner !== id) return;
        const currentStock = Number.isInteger(listing.stock) && Number(listing.stock) >= 0 ? Number(listing.stock) : 0;
        const restoredStock = currentStock + data.items[index].quantity;
        tx.update(listingRefs[index], {
          stock: restoredStock,
          status: restoredStock > 0 ? 'Disponible' : listing.status,
          reservedQuantity: 0,
          reservedByOrderId: FieldValue.delete(),
          reservationExpiresAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      if (paymentRef && paymentSnap?.exists) {
        tx.update(paymentRef, { status: 'CANCELLED', cancelledAt, updatedAt: FieldValue.serverTimestamp() });
      }

      cancelled = { ...data, id, status: 'CANCELLED' };
      tx.update(orderRef, { status: 'CANCELLED', cancelledAt, updatedAt: FieldValue.serverTimestamp() });
    });
    return cancelled;
  },
  async complete(id: string, actorId: string): Promise<{ order: NexoraOrder; eventId?: string }> {
    const orderRef = db().collection('orders').doc(id);
    let completed!: NexoraOrder;
    let eventId: string | undefined;
    await db().runTransaction(async tx => {
      const snap = await tx.get(orderRef);
      if (!snap.exists) throw new Error('ORDER_NOT_FOUND');
      const data = snap.data() as NexoraOrder;
      if (data.buyerId !== actorId && data.sellerId !== actorId) throw new Error('FORBIDDEN');
      if (data.status === 'COMPLETED') { completed = { id, ...data }; return; }
      if (data.status !== 'PAID') throw new Error('INVALID_ORDER_STATE');

      const completedAt = now();
      const listingRefs = data.items.map(item => db().collection('listings').doc(item.listingId));
      const listings = await Promise.all(listingRefs.map(ref => tx.get(ref)));
      listings.forEach((listingSnap, index) => {
        if (!listingSnap.exists) return;
        const listing = listingSnap.data() as Listing;
        const stock = Number.isInteger(listing.stock) && Number(listing.stock) >= 0 ? Number(listing.stock) : 0;
        const owner = String(listing.reservedByOrderId || '').trim();
        if (owner && owner !== id) throw new Error('LISTING_RESERVATION_MISMATCH');
        tx.update(listingRefs[index], {
          status: stock === 0 ? 'Vendido' : 'Disponible',
          reservedQuantity: 0,
          reservedByOrderId: FieldValue.delete(),
          reservationExpiresAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      completed = { ...data, id, status: 'COMPLETED', completedAt };
      tx.update(orderRef, { status: 'COMPLETED', completedAt, updatedAt: FieldValue.serverTimestamp() });
      if (data.requiresInstallation) {
        const outboxRef = db().collection('eventOutbox').doc();
        eventId = outboxRef.id;
        tx.create(outboxRef, {
          id: outboxRef.id, type: 'NEXORA_ORDER_COMPLETED', occurredAt: completedAt, producer: 'NEXORA',
          payload: { eventId: outboxRef.id, type: 'NEXORA_ORDER_COMPLETED', occurredAt: completedAt, userId: data.buyerId, orderId: id, listingIds: data.items.map(i => i.listingId), requiresInstallation: true },
          status: 'PENDING', attempts: 0
        });
      }
    });
    return { order: completed, ...(eventId ? { eventId } : {}) };
  }
};

export const paymentRepository = {
  async get(id: string): Promise<PaymentTransaction | null> {
    const d = await db().collection('paymentTransactions').doc(id).get();
    return d.exists ? ({ id: d.id, ...d.data() } as PaymentTransaction) : null;
  },
  /** @deprecated Provider settlement is canonicalized in the Mercado Pago reconciliation adapter. */
  async settleFromVerifiedProvider(_input: { paymentTransactionId: string; providerPaymentId: string; amountArs: number }): Promise<PaymentTransaction> {
    throw new Error('USE_MERCADO_PAGO_RECONCILIATION');
  }
};

export const reviewRepository = {
  async create(input: Omit<NexoraReview, 'id'>, actorId: string): Promise<NexoraReview> {
    if (input.buyerId !== actorId) throw new Error('FORBIDDEN');
    if (!Number.isFinite(input.rating) || input.rating < 1 || input.rating > 5) throw new Error('INVALID_RATING');
    const orders = await db().collection('orders').where('buyerId', '==', actorId).where('sellerId', '==', input.sellerId).where('status', '==', 'COMPLETED').limit(20).get();
    const eligible = orders.docs.some(doc => {
      const order = doc.data() as NexoraOrder;
      return !input.listingId || order.items.some(item => item.listingId === input.listingId);
    });
    if (!eligible) throw new Error('PURCHASE_REQUIRED');
    const duplicate = await db().collection('nexoraReviews').where('buyerId', '==', actorId).where('sellerId', '==', input.sellerId).limit(50).get();
    if (duplicate.docs.some(doc => (doc.data() as NexoraReview).listingId === input.listingId)) throw new Error('DUPLICATE_REVIEW');
    const ref = db().collection('nexoraReviews').doc();
    const value = { ...input, date: input.date || now(), verifiedPurchase: true };
    await ref.create(value);
    return { id: ref.id, ...value } as NexoraReview;
  }
};

export const conversationRepository = {
  async listForUser(userId: string): Promise<Conversation[]> {
    const [buyerSnap, sellerSnap] = await Promise.all([
      db().collection('conversations').where('buyerId', '==', userId).limit(100).get(),
      db().collection('conversations').where('sellerId', '==', userId).limit(100).get()
    ]);
    return [...new Map([...buyerSnap.docs, ...sellerSnap.docs].map(d => [d.id, { id: d.id, ...d.data() } as Conversation])).values()];
  },
  async create(input: Omit<Conversation, 'id'>, actorId: string): Promise<Conversation> {
    if (input.buyerId !== actorId) throw new Error('FORBIDDEN');
    if (input.buyerId === input.sellerId) throw new Error('INVALID_PARTICIPANTS');
    const listing = await listingRepository.get(input.listingId);
    if (!listing) throw new Error('LISTING_NOT_FOUND');
    if (listing.sellerId !== input.sellerId) throw new Error('INVALID_SELLER');
    const existing = await db().collection('conversations').where('listingId', '==', input.listingId).where('buyerId', '==', actorId).where('sellerId', '==', input.sellerId).limit(1).get();
    if (!existing.empty) return { id: existing.docs[0].id, ...existing.docs[0].data() } as Conversation;
    const timestamp = now();
    const ref = db().collection('conversations').doc();
    const value: Omit<Conversation, 'id'> = { ...input, stage: 'Consulta', lastMessageText: '', lastMessageTime: timestamp, unreadCountBuyer: 0, unreadCountSeller: 0 };
    await ref.create(value);
    return { id: ref.id, ...value };
  },
  async sendMessage(conversationId: string, actorId: string, text: string): Promise<Message> {
    const clean = text.trim().slice(0, 4000);
    if (!clean) throw new Error('INVALID_MESSAGE');
    const conversationRef = db().collection('conversations').doc(conversationId);
    const messageRef = db().collection('conversations').doc(conversationId).collection('messages').doc();
    const timestamp = now();
    let message!: Message;
    await db().runTransaction(async tx => {
      const snap = await tx.get(conversationRef);
      if (!snap.exists) throw new Error('CONVERSATION_NOT_FOUND');
      const conversation = snap.data() as Conversation;
      if (conversation.buyerId !== actorId && conversation.sellerId !== actorId) throw new Error('FORBIDDEN');
      message = { id: messageRef.id, conversationId, senderId: actorId, text: clean, timestamp, isRead: false };
      tx.create(messageRef, message);
      const unreadField = conversation.buyerId === actorId ? 'unreadCountSeller' : 'unreadCountBuyer';
      tx.update(conversationRef, { lastMessageText: clean, lastMessageTime: timestamp, stage: 'En conversación', [unreadField]: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
    });
    return message;
  },
  async listMessages(conversationId: string, actorId: string, limit = 50): Promise<Message[]> {
    const conversation = await db().collection('conversations').doc(conversationId).get();
    if (!conversation.exists) throw new Error('CONVERSATION_NOT_FOUND');
    const data = conversation.data() as Conversation;
    if (data.buyerId !== actorId && data.sellerId !== actorId) throw new Error('FORBIDDEN');
    const snap = await db().collection('conversations').doc(conversationId).collection('messages').orderBy('timestamp', 'asc').limit(safeLimit(limit)).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
  }
};

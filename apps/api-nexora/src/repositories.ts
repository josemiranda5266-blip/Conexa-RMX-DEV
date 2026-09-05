import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from './firebaseAdmin.js';
import type { Conversation, Listing, NexoraOrder, NexoraReview, Shop } from '@super-app/shared-types';

const now = () => new Date().toISOString();
const db = () => getDb();

export const listingRepository = {
  async list(limit = 50): Promise<Listing[]> {
    const snap = await db().collection('listings').where('status', '==', 'Disponible').limit(Math.min(limit, 100)).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Listing));
  },
  async get(id: string): Promise<Listing | null> {
    const d = await db().collection('listings').doc(id).get();
    return d.exists ? ({ id: d.id, ...d.data() } as Listing) : null;
  },
  async create(input: Omit<Listing, 'id'>): Promise<Listing> {
    const ref = db().collection('listings').doc();
    const value = { ...input, createdAt: input.createdAt || now() };
    await ref.create(value);
    return { id: ref.id, ...value } as Listing;
  }
};

export const shopRepository = {
  async list(limit = 50): Promise<Shop[]> {
    const snap = await db().collection('shops').limit(Math.min(limit, 100)).get();
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
    const snap = await db().collection('orders').where('buyerId', '==', userId).limit(100).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as NexoraOrder));
  },
  async create(input: Omit<NexoraOrder, 'id'>): Promise<NexoraOrder> {
    const ref = db().collection('orders').doc();
    const value = { ...input, createdAt: input.createdAt || now() };
    await ref.create(value);
    return { id: ref.id, ...value } as NexoraOrder;
  },
  async complete(id: string, actorId: string): Promise<{ order: NexoraOrder; eventId: string }> {
    const orderRef = db().collection('orders').doc(id);
    const outboxRef = db().collection('eventOutbox').doc();
    let completed!: NexoraOrder;
    await db().runTransaction(async tx => {
      const snap = await tx.get(orderRef);
      if (!snap.exists) throw new Error('ORDER_NOT_FOUND');
      const data = snap.data() as NexoraOrder;
      if (data.buyerId !== actorId && data.sellerId !== actorId) throw new Error('FORBIDDEN');
      if (data.status === 'COMPLETED') { completed = { id, ...data }; return; }
      if (!['PAID', 'PENDING'].includes(data.status)) throw new Error('INVALID_ORDER_STATE');
      const completedAt = now();
      completed = { ...data, id, status: 'COMPLETED', completedAt };
      tx.update(orderRef, { status: 'COMPLETED', completedAt, updatedAt: FieldValue.serverTimestamp() });
      tx.create(outboxRef, {
        id: outboxRef.id,
        type: 'NEXORA_ORDER_COMPLETED',
        occurredAt: completedAt,
        producer: 'NEXORA',
        payload: { eventId: outboxRef.id, type: 'NEXORA_ORDER_COMPLETED', occurredAt: completedAt, userId: data.buyerId, orderId: id, listingIds: data.items.map(i => i.listingId), requiresInstallation: data.requiresInstallation },
        status: 'PENDING', attempts: 0
      });
    });
    return { order: completed, eventId: outboxRef.id };
  }
};

export const reviewRepository = {
  async create(input: Omit<NexoraReview, 'id'>): Promise<NexoraReview> {
    if (!Number.isFinite(input.rating) || input.rating < 1 || input.rating > 5) throw new Error('INVALID_RATING');
    const ref = db().collection('nexoraReviews').doc();
    const value = { ...input, date: input.date || now() };
    await ref.create(value);
    return { id: ref.id, ...value } as NexoraReview;
  }
};

export const conversationRepository = {
  async listForUser(userId: string): Promise<Conversation[]> {
    const snap = await db().collection('conversations').where('buyerId', '==', userId).limit(100).get();
    const buyer = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
    const sellerSnap = await db().collection('conversations').where('sellerId', '==', userId).limit(100).get();
    const seller = sellerSnap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
    return [...new Map([...buyer, ...seller].map(x => [x.id, x])).values()];
  }
};

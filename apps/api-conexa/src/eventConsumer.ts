import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { NexoraOrderCompletedEvent } from '@super-app/shared-types';

const MAX_ATTEMPTS = 5;

function db() {
  const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? '{}')) });
  return getFirestore(app);
}

export async function processNexoraOrderCompleted(limit = 20): Promise<number> {
  const firestore = db();
  const snapshot = await firestore.collection('eventOutbox').where('type', '==', 'NEXORA_ORDER_COMPLETED').where('status', '==', 'PENDING').limit(Math.min(Math.max(limit, 1), 50)).get();
  let processed = 0;
  for (const eventDoc of snapshot.docs) {
    try {
      const didProcess = await firestore.runTransaction(async tx => {
        const current = await tx.get(eventDoc.ref);
        if (!current.exists || current.data()?.status !== 'PENDING') return false;
        const data = current.data() || {};
        const event = data.payload as NexoraOrderCompletedEvent;
        if (!event?.orderId || !event?.userId) throw new Error('INVALID_EVENT');

        const orderRef = firestore.collection('orders').doc(event.orderId);
        const order = await tx.get(orderRef);
        if (!order.exists) throw new Error('ORDER_NOT_FOUND');
        const orderData = order.data() || {};
        if (String(orderData.status || '').toUpperCase() !== 'COMPLETED') {
          tx.update(eventDoc.ref, {
            status: 'PUBLISHED',
            processedAt: new Date().toISOString(),
            attempts: (data.attempts ?? 0) + 1,
            lastError: 'EVENT_STALE_ORDER_NOT_COMPLETED',
          });
          return true;
        }
        if (String(orderData.buyerId || '') !== event.userId) throw new Error('EVENT_ORDER_USER_MISMATCH');
        if (event.requiresInstallation !== true || orderData.requiresInstallation !== true) {
          tx.update(eventDoc.ref, {
            status: 'PUBLISHED',
            processedAt: new Date().toISOString(),
            attempts: (data.attempts ?? 0) + 1,
            lastError: 'EVENT_NOT_REQUIRING_INSTALLATION',
          });
          return true;
        }

        const leadRef = firestore.collection('installationLeads').doc(event.orderId);
        const lead = await tx.get(leadRef);
        if (!lead.exists) {
          tx.create(leadRef, { sourceEventId: event.eventId, userId: event.userId, orderId: event.orderId, serviceType: 'INSTALLATION', status: 'NEW', createdAt: new Date().toISOString() });
        }
        tx.update(eventDoc.ref, { status: 'PUBLISHED', processedAt: new Date().toISOString(), attempts: (data.attempts ?? 0) + 1, lastError: null });
        return true;
      });
      if (didProcess) processed++;
    } catch (error) {
      const attempts = Number(eventDoc.data().attempts ?? 0) + 1;
      await eventDoc.ref.update({
        status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
        lastError: error instanceof Error ? error.message : 'UNKNOWN',
        attempts,
        updatedAt: new Date().toISOString(),
      });
    }
  }
  return processed;
}

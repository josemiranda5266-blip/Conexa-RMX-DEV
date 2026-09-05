import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { NexoraOrderCompletedEvent } from '@super-app/shared-types';

function db() {
  const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? '{}')) });
  return getFirestore(app);
}

export async function processNexoraOrderCompleted(limit = 20): Promise<number> {
  const firestore = db();
  const snapshot = await firestore.collection('eventOutbox').where('type', '==', 'NEXORA_ORDER_COMPLETED').where('status', '==', 'PENDING').limit(Math.min(limit, 50)).get();
  let processed = 0;
  for (const eventDoc of snapshot.docs) {
    try {
      await firestore.runTransaction(async tx => {
        const current = await tx.get(eventDoc.ref);
        if (!current.exists || current.data()?.status !== 'PENDING') return;
        const event = current.data()?.payload as NexoraOrderCompletedEvent;
        if (!event?.orderId || !event?.userId) throw new Error('INVALID_EVENT');
        const leadRef = firestore.collection('installationLeads').doc(event.orderId);
        const lead = await tx.get(leadRef);
        if (!lead.exists && event.requiresInstallation) {
          tx.create(leadRef, { sourceEventId: event.eventId, userId: event.userId, orderId: event.orderId, serviceType: 'INSTALLATION', status: 'NEW', createdAt: new Date().toISOString() });
        }
        tx.update(eventDoc.ref, { status: 'PUBLISHED', processedAt: new Date().toISOString(), attempts: (current.data()?.attempts ?? 0) + 1 });
      });
      processed++;
    } catch (error) {
      await eventDoc.ref.update({ status: 'FAILED', lastError: error instanceof Error ? error.message : 'UNKNOWN', attempts: (eventDoc.data().attempts ?? 0) + 1 });
    }
  }
  return processed;
}

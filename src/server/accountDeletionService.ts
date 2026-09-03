import { getAdminDb, getFirebaseAdmin } from './firebaseAdmin.js';
import {
  ACCOUNT_DELETION_STAGES,
  canAdvanceDeletionStage,
  getNextDeletionStage,
  isTerminalDeletionStage,
  normalizeDeletionUserId,
  type AccountDeletionCheckpoint,
  type AccountDeletionStage,
} from './accountDeletionPolicy.js';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';

const BATCH_SIZE = 400;

export interface AccountDeletionServiceDb {
  collection: (name: string) => any;
  batch: () => any;
  runTransaction: (callback: (tx: any) => Promise<unknown>) => Promise<unknown>;
}

function now(): string {
  return new Date().toISOString();
}

function checkpointRef(db: AccountDeletionServiceDb, userId: string): any {
  return db.collection('account_deletions').doc(userId);
}

async function readOrCreateCheckpoint(
  db: AccountDeletionServiceDb,
  userId: string,
): Promise<AccountDeletionCheckpoint> {
  const ref = checkpointRef(db, userId);
  return db.runTransaction(async (tx: any) => {
    const snapshot = await tx.get(ref);
    if (snapshot.exists) return snapshot.data() as AccountDeletionCheckpoint;

    const timestamp = now();
    const checkpoint: AccountDeletionCheckpoint = {
      userId,
      stage: 'REQUESTED',
      requestedAt: timestamp,
      updatedAt: timestamp,
    };
    tx.create(ref, checkpoint);
    return checkpoint;
  });
}

async function advanceStage(
  db: AccountDeletionServiceDb,
  userId: string,
  current: AccountDeletionStage,
  next: AccountDeletionStage,
): Promise<void> {
  if (!canAdvanceDeletionStage(current, next)) {
    throw new Error('INVALID_DELETION_STAGE_TRANSITION');
  }

  const ref = checkpointRef(db, userId);
  await db.runTransaction(async (tx: any) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new Error('DELETION_CHECKPOINT_NOT_FOUND');
    const stored = snapshot.data() as AccountDeletionCheckpoint;

    if (stored.stage === next) return;
    if (stored.stage !== current) {
      throw new Error('DELETION_CHECKPOINT_CONFLICT');
    }

    const updatedAt = now();
    const update: Record<string, unknown> = { stage: next, updatedAt };
    if (next === 'COMPLETED') update.completedAt = updatedAt;
    tx.update(ref, update);
  });
}

async function markStageError(
  db: AccountDeletionServiceDb,
  userId: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await checkpointRef(db, userId).set({
    updatedAt: now(),
    lastErrorCode: message.slice(0, 160),
  }, { merge: true });
}

async function cleanupFirestore(db: AccountDeletionServiceDb, userId: string): Promise<void> {
  const userRef = db.collection('users').doc(userId);

  // Preserve commercial/audit integrity. Private profile data is removed while
  // durable business records retain their IDs and are anonymized by ownership.
  await userRef.delete();
  await userRef.collection('private').doc('info').delete().catch(() => undefined);

  for (const collectionName of ['public_professional_profiles', 'radar_candidates']) {
    await db.collection(collectionName).doc(userId).delete().catch(() => undefined);
  }

  const messageSnapshot = await db.collectionGroup('messages').where('senderId', '==', userId).get();
  for (let offset = 0; offset < messageSnapshot.docs.length; offset += BATCH_SIZE) {
    const batch = db.batch();
    messageSnapshot.docs.slice(offset, offset + BATCH_SIZE).forEach((messageDoc: any) => {
      batch.update(messageDoc.ref, {
        content: '[MENSAJE ELIMINADO - USUARIO DADO DE BAJA]',
        senderName: 'Usuario dado de baja',
        isDeleted: true,
      });
    });
    await batch.commit();
  }

  // Anonymize client ownership on commercial records instead of deleting
  // financial history. This keeps transaction/request/review auditability intact.
  for (const collectionName of ['service_requests', 'transactions', 'reviews']) {
    const snapshot = await db.collection(collectionName).where('clientId', '==', userId).get();
    for (let offset = 0; offset < snapshot.docs.length; offset += BATCH_SIZE) {
      const batch = db.batch();
      snapshot.docs.slice(offset, offset + BATCH_SIZE).forEach((doc: any) => {
        batch.update(doc.ref, {
          clientId: 'DELETED_USER',
          clientName: 'Usuario dado de baja',
        });
      });
      await batch.commit();
    }
  }

  // Remove professional identity from mutable service-request assignment data.
  // Historical financial records retain the opaque professional reference for
  // auditability, while public projections are already deleted above.
  for (const fieldName of ['assignedProfessionalId']) {
    const snapshot = await db.collection('service_requests').where(fieldName, '==', userId).get();
    for (let offset = 0; offset < snapshot.docs.length; offset += BATCH_SIZE) {
      const batch = db.batch();
      snapshot.docs.slice(offset, offset + BATCH_SIZE).forEach((doc: any) => {
        batch.update(doc.ref, {
          assignedProfessionalId: 'DELETED_PROFESSIONAL',
        });
      });
      await batch.commit();
    }
  }

  // Remove deleted professionals from candidate/bidding arrays where present.
  const biddingSnapshot = await db.collection('service_requests').where('biddingProfessionalIds', 'array-contains', userId).get();
  for (let offset = 0; offset < biddingSnapshot.docs.length; offset += BATCH_SIZE) {
    const batch = db.batch();
    biddingSnapshot.docs.slice(offset, offset + BATCH_SIZE).forEach((doc: any) => {
      const data = doc.data() as { biddingProfessionalIds?: unknown };
      const ids = Array.isArray(data.biddingProfessionalIds)
        ? data.biddingProfessionalIds.filter((id) => id !== userId)
        : [];
      batch.update(doc.ref, { biddingProfessionalIds: ids });
    });
    await batch.commit();
  }

  // Preserve verified review evidence but anonymize the professional reference
  // if the account owner is deleted, preventing the deleted UID from remaining
  // as a live identity in mutable documents.
  const professionalReviews = await db.collection('reviews').where('professionalId', '==', userId).get();
  for (let offset = 0; offset < professionalReviews.docs.length; offset += BATCH_SIZE) {
    const batch = db.batch();
    professionalReviews.docs.slice(offset, offset + BATCH_SIZE).forEach((doc: any) => {
      batch.update(doc.ref, { professionalId: 'DELETED_PROFESSIONAL' });
    });
    await batch.commit();
  }
}

async function cleanupStorage(userId: string): Promise<void> {
  const app = getFirebaseAdmin();
  if (!app) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  const bucket = getAdminStorage(app).bucket();
  const [files] = await bucket.getFiles({ prefix: `verification-documents/${userId}/` });
  for (const file of files) await file.delete();
}

export async function processAccountDeletion(
  authenticatedUserId: unknown,
  db: AccountDeletionServiceDb = getAdminDb(),
): Promise<AccountDeletionCheckpoint> {
  const userId = normalizeDeletionUserId(authenticatedUserId);
  let checkpoint = await readOrCreateCheckpoint(db, userId);

  if (isTerminalDeletionStage(checkpoint.stage)) return checkpoint;

  try {
    while (!isTerminalDeletionStage(checkpoint.stage)) {
      const next = getNextDeletionStage(checkpoint.stage);
      if (!next) break;

      if (next === 'FIRESTORE_CLEANUP') {
        await cleanupFirestore(db, userId);
      } else if (next === 'STORAGE_CLEANUP') {
        await cleanupStorage(userId);
      } else if (next === 'AUDIT_RECORDED') {
        await db.collection('admin_audit_logs').doc(`DELETE_ACCOUNT_${userId}`).set({
          action: 'DELETE_ACCOUNT',
          targetType: 'USER',
          targetId: userId,
          result: 'SUCCESS',
          timestamp: now(),
        }, { merge: true });
      } else if (next === 'AUTH_ACCOUNT_DELETED') {
        const app = getFirebaseAdmin();
        if (!app) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
        try {
          await app.auth().deleteUser(userId);
        } catch (error: any) {
          if (error?.code !== 'auth/user-not-found') throw error;
        }
      }

      await advanceStage(db, userId, checkpoint.stage, next);
      checkpoint = {
        ...checkpoint,
        stage: next,
        updatedAt: now(),
        ...(next === 'COMPLETED' ? { completedAt: now() } : {}),
      };
    }

    return checkpoint;
  } catch (error) {
    await markStageError(db, userId, error);
    throw error;
  }
}

export { ACCOUNT_DELETION_STAGES };

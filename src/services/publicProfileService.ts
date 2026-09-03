import {
  collection,
  documentId,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { toPublicUserProfile, type PublicUserProfile } from '../domain/publicProfile';

const MAX_PROFILE_QUERY_SIZE = 30;

function requireDb() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured.');
  }
  return db;
}

function normalizeIds(userIds: string[]): string[] {
  return Array.from(new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean)));
}

function mapSnapshot(snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }): PublicUserProfile[] {
  return snapshot.docs.map((profileDoc) => {
    const data = profileDoc.data();
    return toPublicUserProfile({
      id: profileDoc.id,
      name: data.name,
      avatar: data.avatar,
      professionName: data.professionName,
      bioPublic: data.bioPublic,
      location: data.location as PublicUserProfile['location'] | undefined,
      isIdentityVerified: data.isIdentityVerified,
      isProfessionalVerified: data.isProfessionalVerified,
      rating: data.rating,
      reviewCount: data.reviewCount,
      jobsCompleted: data.jobsCompleted,
      availabilityStatus: data.availabilityStatus,
    });
  });
}

/**
 * Subscribes only to explicitly public profile documents needed by a feature.
 * IDs are chunked because Firestore `in` queries have a finite operand limit.
 * This intentionally does not fall back to `users`.
 */
export function subscribeToPublicProfiles(
  userIds: string[],
  onData: (profiles: PublicUserProfile[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const firestore = requireDb();
  const normalizedIds = normalizeIds(userIds);

  if (normalizedIds.length === 0) {
    onData([]);
    return () => {};
  }

  const chunks: string[][] = [];
  for (let index = 0; index < normalizedIds.length; index += MAX_PROFILE_QUERY_SIZE) {
    chunks.push(normalizedIds.slice(index, index + MAX_PROFILE_QUERY_SIZE));
  }

  const profilesById = new Map<string, PublicUserProfile>();
  const unsubscribers: Unsubscribe[] = [];

  const publish = () => {
    onData(normalizedIds.flatMap((id) => {
      const profile = profilesById.get(id);
      return profile ? [profile] : [];
    }));
  };

  const reportError = (error: unknown) => {
    onError?.(error instanceof Error ? error : new Error('Invalid public profile data.'));
  };

  chunks.forEach((chunk) => {
    const unsubscribe = onSnapshot(
      query(collection(firestore, 'public_profiles'), where(documentId(), 'in', chunk)),
      (snapshot) => {
        try {
          chunk.forEach((id) => profilesById.delete(id));
          mapSnapshot(snapshot).forEach((profile) => profilesById.set(profile.id, profile));
          publish();
        } catch (error) {
          reportError(error);
        }
      },
      reportError,
    );
    unsubscribers.push(unsubscribe);
  });

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

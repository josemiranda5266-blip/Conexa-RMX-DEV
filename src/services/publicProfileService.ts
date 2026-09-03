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

/**
 * Subscribes only to explicitly public profile documents needed by a feature.
 * This intentionally does not fall back to `users`, so callers cannot
 * accidentally reintroduce the global private-profile directory.
 */
export function subscribeToPublicProfiles(
  userIds: string[],
  onData: (profiles: PublicUserProfile[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const firestore = requireDb();
  const normalizedIds = Array.from(new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean)));

  if (normalizedIds.length === 0) {
    onData([]);
    return () => {};
  }

  if (normalizedIds.length > MAX_PROFILE_QUERY_SIZE) {
    const error = new Error(`Public profile query exceeds ${MAX_PROFILE_QUERY_SIZE} users.`);
    onError?.(error);
    return () => {};
  }

  return onSnapshot(
    query(collection(firestore, 'public_profiles'), where(documentId(), 'in', normalizedIds)),
    (snapshot) => {
      try {
        const profiles = snapshot.docs.map((profileDoc) => {
          const data = profileDoc.data();
          return toPublicUserProfile({
            id: profileDoc.id,
            name: data.name,
            avatar: data.avatar,
            professionName: data.professionName,
            bioPublic: data.bioPublic,
            location: data.location,
            isIdentityVerified: data.isIdentityVerified,
            isProfessionalVerified: data.isProfessionalVerified,
            rating: data.rating,
            reviewCount: data.reviewCount,
            jobsCompleted: data.jobsCompleted,
            availabilityStatus: data.availabilityStatus,
          });
        });
        onData(profiles);
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Invalid public profile data.'));
      }
    },
    (error) => onError?.(error),
  );
}

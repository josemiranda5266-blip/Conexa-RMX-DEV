import {
  collection,
  documentId,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import type { PublicUserProfile } from '../domain/publicProfile';

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
          const data = profileDoc.data() as Partial<PublicUserProfile>;
          return {
            id: profileDoc.id,
            name: typeof data.name === 'string' ? data.name : '',
            avatar: typeof data.avatar === 'string' ? data.avatar : '',
            profession: typeof data.profession === 'string' ? data.profession : undefined,
            isIdentityVerified: data.isIdentityVerified === true,
            isProfessionalVerified: data.isProfessionalVerified === true,
          } satisfies PublicUserProfile;
        });
        onData(profiles);
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Invalid public profile data.'));
      }
    },
    (error) => onError?.(error),
  );
}

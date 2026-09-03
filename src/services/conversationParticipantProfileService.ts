import type { Unsubscribe } from 'firebase/firestore';
import { subscribeToPublicProfiles, type PublicUserProfile } from './publicProfileService';

/**
 * Resolves only the public projection required to render conversation participants.
 * Private `/users` documents are deliberately not queried here.
 */
export function subscribeToConversationParticipantProfiles(
  participantIds: string[],
  onData: (profilesById: ReadonlyMap<string, PublicUserProfile>) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToPublicProfiles(
    participantIds,
    (profiles) => {
      const profilesById = new Map<string, PublicUserProfile>();
      profiles.forEach((profile) => profilesById.set(profile.id, profile));
      onData(profilesById);
    },
    onError,
  );
}

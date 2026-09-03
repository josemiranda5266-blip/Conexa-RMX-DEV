import type { Role, UserProfile } from '../types';
import {
  resolveEffectiveUserIdentity,
  type AuthClaimsIdentity,
} from '../domain/effectiveUserIdentity';

/**
 * Builds the authenticated frontend profile from Firebase-authenticated
 * identity plus the Firestore profile. Authorization-sensitive fields are
 * resolved through the centralized claim-authoritative policy instead of a
 * raw Firestore merge.
 */
export function projectAuthenticatedUser(
  firebaseIdentity: AuthClaimsIdentity,
  profile: Partial<UserProfile> | null | undefined,
  fallback: UserProfile,
): UserProfile {
  const identity = resolveEffectiveUserIdentity(firebaseIdentity, profile);

  return {
    ...fallback,
    ...(profile || {}),
    id: firebaseIdentity.uid,
    role: identity.role as Role,
    isProfessional: identity.isProfessional,
    hasProfessionalProfile: identity.hasProfessionalProfile,
    activeMode: identity.activeMode,
  };
}

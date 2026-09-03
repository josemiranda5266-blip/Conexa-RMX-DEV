/**
 * Frontend projection of an authenticated user.
 *
 * Firestore profile data is user-editable and therefore cannot be allowed to
 * overwrite authorization derived from Firebase Auth custom claims. This helper
 * keeps the rule explicit for both initial hydration and realtime updates.
 */

import type { Role, UserProfile } from '../types';

type AuthProjectionInput = {
  firebaseUid: string;
  claimRole: Role;
  profile: Partial<UserProfile>;
  existing?: UserProfile | null;
};

function isAdminRole(role: Role | undefined): role is 'ADMIN' | 'SUPER_ADMIN' {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function projectAuthenticatedUser({ firebaseUid, claimRole, profile, existing = null }: AuthProjectionInput): UserProfile {
  const firestoreRole = profile.role;
  const effectiveRole: Role = isAdminRole(firestoreRole)
    ? (isAdminRole(claimRole) ? firestoreRole : 'USER')
    : (firestoreRole || (isAdminRole(claimRole) ? claimRole : 'USER'));

  const hasProfessionalProfile =
    profile.hasProfessionalProfile === true ||
    profile.isProfessional === true ||
    effectiveRole === 'PROFESSIONAL';

  const activeMode = profile.activeMode ||
    (isAdminRole(effectiveRole) ? 'ADMIN' : hasProfessionalProfile ? 'PROFESSIONAL' : 'CLIENT');

  return {
    ...(existing || {}),
    ...profile,
    id: firebaseUid,
    role: effectiveRole,
    activeMode,
    isProfessional: hasProfessionalProfile,
    hasProfessionalProfile,
  } as UserProfile;
}

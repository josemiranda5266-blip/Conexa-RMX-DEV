import type { UserProfile, Role } from '../types';

export interface AuthClaimsIdentity {
  uid: string;
  role: Role;
}

/**
 * Resolves the frontend identity from Firebase-authenticated claims plus the
 * Firestore profile. Privileged roles are claim-authoritative; Firestore data
 * may provide capability/profile fields but cannot elevate the authenticated
 * session by itself.
 */
export function resolveEffectiveUserIdentity(
  firebaseIdentity: AuthClaimsIdentity,
  profile: Partial<UserProfile> | null | undefined,
): Pick<UserProfile, 'role' | 'isProfessional' | 'hasProfessionalProfile' | 'activeMode'> {
  const claimRole = firebaseIdentity.role || 'USER';
  const firestoreRole = profile?.role;
  const privilegedClaim = claimRole === 'ADMIN' || claimRole === 'SUPER_ADMIN';

  let role: Role = 'USER';
  if (privilegedClaim) {
    role = claimRole;
  } else if (firestoreRole === 'ADMIN' || firestoreRole === 'SUPER_ADMIN') {
    role = 'USER';
  } else if (firestoreRole) {
    role = firestoreRole;
  } else {
    role = claimRole;
  }

  const hasProfessionalProfile =
    profile?.hasProfessionalProfile === true ||
    profile?.isProfessional === true ||
    role === 'PROFESSIONAL';

  const isProfessional = hasProfessionalProfile;
  const requestedMode = profile?.activeMode;
  const activeMode =
    role === 'ADMIN' || role === 'SUPER_ADMIN'
      ? 'ADMIN'
      : requestedMode === 'PROFESSIONAL' && hasProfessionalProfile
        ? 'PROFESSIONAL'
        : 'CLIENT';

  return { role, isProfessional, hasProfessionalProfile, activeMode };
}

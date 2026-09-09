import type { UserProfile, Role } from '../types';

export interface AuthClaimsIdentity {
  uid: string;
  role: Role;
}

/**
 * Resolves the authenticated identity from Firebase custom claims plus the
 * public Firestore profile.
 *
 * Security boundary:
 * - `role` is always authoritative from the authenticated claim.
 * - Firestore may describe professional capability/profile data, but it can
 *   never promote a USER to a privileged role by editing `/users/{uid}`.
 * - `hasProfessionalProfile` is a capability flag and is intentionally
 *   independent from the security role.
 * - `activeMode` is a UI/session preference constrained by the identity and
 *   available capabilities.
 */
export function resolveEffectiveUserIdentity(
  firebaseIdentity: AuthClaimsIdentity,
  profile: Partial<UserProfile> | null | undefined,
): Pick<UserProfile, 'role' | 'isProfessional' | 'hasProfessionalProfile' | 'activeMode'> {
  const role: Role = firebaseIdentity.role || 'USER';

  const hasProfessionalProfile =
    profile?.hasProfessionalProfile === true ||
    profile?.isProfessional === true ||
    profile?.professionId != null ||
    Boolean(profile?.professionName?.trim());

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

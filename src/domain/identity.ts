import type { Role, UserProfile } from '../types';

export type ActiveMode = 'CLIENT' | 'PROFESSIONAL';

export interface IdentityCapabilities {
  hasClientProfile: boolean;
  hasProfessionalProfile: boolean;
  activeMode: ActiveMode;
}

/**
 * Resolves account capabilities without conflating the Firebase authorization role
 * with the mode the user is currently operating in.
 *
 * Legacy profiles may not have the new capability flags yet, so role remains a
 * compatibility fallback until the profile is migrated.
 */
export function resolveIdentityCapabilities(
  profile: Partial<UserProfile>,
  effectiveRole: Role,
): IdentityCapabilities {
  const hasClientProfile = profile.hasClientProfile ?? true;
  const hasProfessionalProfile =
    profile.hasProfessionalProfile ?? effectiveRole === 'PROFESSIONAL';

  const requestedMode = profile.activeMode;
  const activeMode: ActiveMode =
    requestedMode === 'PROFESSIONAL' && hasProfessionalProfile
      ? 'PROFESSIONAL'
      : 'CLIENT';

  return {
    hasClientProfile,
    hasProfessionalProfile,
    activeMode,
  };
}

export function canOperateAsProfessional(
  profile: Partial<UserProfile>,
  effectiveRole: Role,
): boolean {
  return resolveIdentityCapabilities(profile, effectiveRole).hasProfessionalProfile;
}

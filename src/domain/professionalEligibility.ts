import { User } from '../types';

/**
 * Evaluates whether a user account possesses persistent professional capacity,
 * regardless of their current UI active mode (e.g. CLIENT vs PROFESSIONAL view).
 *
 * A user is recognized as having professional capacity if ANY of these conditions are met:
 * 1. user.isProfessional === true
 * 2. user.hasProfessionalProfile === true
 * 3. user.role === 'PROFESSIONAL'
 */
export function isUserCandidateProfessional(user?: Partial<User> | null): boolean {
  if (!user) return false;

  return Boolean(
    user.isProfessional === true ||
      user.hasProfessionalProfile === true ||
      user.role === 'PROFESSIONAL'
  );
}

import type { UserProfile } from '../types';

/**
 * Backend/frontend-neutral projection used by RADAR matching.
 *
 * This is intentionally smaller than UserProfile. It contains only attributes
 * required to discover, score and present a professional match. Private
 * contact data, credentials, exact address, subscription/admin state and other
 * unrelated profile fields must never cross this boundary.
 */
export interface RadarCandidate {
  id: string;
  name: string;
  professionName: string;
  professionId?: string;
  specialties: string[];
  city: string;
  province: string;
  approxZone: string;
  rating: number;
  reviewCount: number;
  jobsCompleted: number;
  trustScore: number;
  availabilityStatus: UserProfile['availabilityStatus'];
  avatar: string;
  isIdentityVerified: boolean;
  isProfessionalVerified: boolean;
}

/**
 * Explicitly projects a private user record into the minimum RADAR shape.
 * This helper is the intended compatibility boundary while the candidate
 * source is migrated away from the broad /users collection.
 */
export function toRadarCandidate(user: UserProfile): RadarCandidate | null {
  if (user.isBlocked === true) return null;

  const capable = user.hasProfessionalProfile === true ||
    user.isProfessional === true ||
    user.role === 'PROFESSIONAL';

  if (!capable) return null;

  return {
    id: user.id,
    name: user.name || 'Profesional CONEXA',
    professionName: user.professionName || '',
    professionId: user.professionId,
    specialties: Array.isArray(user.specialties) ? user.specialties.filter(Boolean) : [],
    city: user.location?.city || '',
    province: user.location?.province || '',
    approxZone: user.location?.approxZone || '',
    rating: Number.isFinite(user.rating) ? user.rating : 0,
    reviewCount: Number.isFinite(user.reviewCount) ? user.reviewCount : 0,
    jobsCompleted: Number.isFinite(user.jobsCompleted) ? user.jobsCompleted : 0,
    trustScore: Number.isFinite(user.trustScore) ? user.trustScore : 0,
    availabilityStatus: user.availabilityStatus,
    avatar: user.avatar || '',
    isIdentityVerified: user.isIdentityVerified === true,
    isProfessionalVerified: user.isProfessionalVerified === true,
  };
}

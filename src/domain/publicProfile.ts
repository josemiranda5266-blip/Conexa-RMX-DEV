import type { UserProfile } from '../types';

/**
 * Deliberately small public representation of a CONEXA user.
 * Never expose the complete UserProfile as a directory/document contract.
 */
export interface PublicUserProfile {
  id: string;
  name: string;
  avatar: string;
  professionName?: string;
  bioPublic?: string;
  location: Pick<UserProfile['location'], 'city' | 'province' | 'country' | 'approxZone'>;
  isIdentityVerified?: boolean;
  isProfessionalVerified?: boolean;
  rating: number;
  reviewCount: number;
  jobsCompleted: number;
  availabilityStatus: UserProfile['availabilityStatus'];
}

export function toPublicUserProfile(user: Partial<UserProfile> & { id: string }): PublicUserProfile {
  return {
    id: user.id,
    name: String(user.name || 'Usuario CONEXA').slice(0, 120),
    avatar: String(user.avatar || '').slice(0, 1000),
    ...(user.professionName ? { professionName: String(user.professionName).slice(0, 160) } : {}),
    ...(user.bioPublic ? { bioPublic: String(user.bioPublic).slice(0, 2000) } : {}),
    location: {
      city: String(user.location?.city || '').slice(0, 120),
      province: String(user.location?.province || '').slice(0, 120),
      country: String(user.location?.country || '').slice(0, 120),
      approxZone: String(user.location?.approxZone || '').slice(0, 160),
    },
    isIdentityVerified: user.isIdentityVerified === true,
    isProfessionalVerified: user.isProfessionalVerified === true,
    rating: Number.isFinite(user.rating) ? Math.max(0, Math.min(5, user.rating as number)) : 0,
    reviewCount: Number.isFinite(user.reviewCount) ? Math.max(0, Math.floor(user.reviewCount as number)) : 0,
    jobsCompleted: Number.isFinite(user.jobsCompleted) ? Math.max(0, Math.floor(user.jobsCompleted as number)) : 0,
    availabilityStatus: user.availabilityStatus || 'EN_CONSULTA',
  };
}

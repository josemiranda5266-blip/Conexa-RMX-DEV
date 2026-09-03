import type { ServiceItem, UserProfile } from '../types';

export interface PublicProfessionalProfile {
  id: string;
  name: string;
  avatar: string;
  businessName?: string;
  professionId?: string | null;
  professionName?: string;
  bioPublic?: string;
  specialties: string[];
  description?: string;
  workZoneRadiusKm: number;
  workingHours: string;
  servicesOffered: Array<Pick<ServiceItem, 'id' | 'title' | 'description' | 'approxPriceArs'>>;
  portfolioImages: string[];
  location: Pick<UserProfile['location'], 'city' | 'province' | 'country' | 'approxZone'>;
  isIdentityVerified: boolean;
  isProfessionalVerified: boolean;
  rating: number;
  reviewCount: number;
  jobsCompleted: number;
  availabilityStatus: UserProfile['availabilityStatus'];
  updatedAt?: string;
}

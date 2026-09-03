import type { Unsubscribe } from 'firebase/firestore';
import type { PublicProfessionalProfile } from '../domain/publicProfessionalProfile';
import { subscribeToPublicProfessionalProfiles } from './publicProfessionalProfileService';

export interface PublicProfessionalDirectoryFilters {
  searchQuery?: string;
  professionName?: string;
  city?: string;
  onlyVerified?: boolean;
}

function includesQuery(value: string | undefined, query: string): boolean {
  return Boolean(value && value.toLowerCase().includes(query));
}

export function filterPublicProfessionalProfiles(
  profiles: PublicProfessionalProfile[],
  filters: PublicProfessionalDirectoryFilters,
): PublicProfessionalProfile[] {
  const query = filters.searchQuery?.trim().toLowerCase() || '';
  const profession = filters.professionName?.trim().toLowerCase() || '';
  const city = filters.city?.trim().toLowerCase() || '';

  return profiles.filter((profile) => {
    if (query) {
      const matchesQuery = [
        profile.name,
        profile.businessName,
        profile.professionName,
        profile.description,
        profile.bioPublic,
        ...profile.specialties,
      ].some((value) => includesQuery(value, query));
      if (!matchesQuery) return false;
    }

    if (profession && !includesQuery(profile.professionName, profession)) return false;
    if (city && !includesQuery(profile.location.city, city)) return false;

    if (filters.onlyVerified && !(profile.isIdentityVerified && profile.isProfessionalVerified)) {
      return false;
    }

    return true;
  });
}

export function subscribeToPublicProfessionalDirectory(
  onData: (profiles: PublicProfessionalProfile[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToPublicProfessionalProfiles(onData, onError);
}

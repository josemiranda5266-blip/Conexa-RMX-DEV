import { collection, onSnapshot, orderBy, query, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ServiceItem } from '../types';
import type { PublicProfessionalProfile } from '../domain/publicProfessionalProfile';

const MAX_PROFILES = 500;

function normalizeString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeList(value: unknown, maxItems: number, maxItemLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => normalizeString(item, maxItemLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeServices(value: unknown): PublicProfessionalProfile['servicesOffered'] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item, index) => {
      const id = normalizeString(item.id, 120) || `service-${index + 1}`;
      const title = normalizeString(item.title, 160);
      const description = normalizeString(item.description, 1000);
      const rawPrice = item.approxPriceArs;
      const parsedPrice = rawPrice === undefined ? undefined : Number(rawPrice);
      return {
        id,
        title,
        description,
        ...(parsedPrice !== undefined && Number.isFinite(parsedPrice) && parsedPrice >= 0
          ? { approxPriceArs: Math.min(parsedPrice, 100_000_000) }
          : {}),
      } satisfies Pick<ServiceItem, 'id' | 'title' | 'description' | 'approxPriceArs'>;
    })
    .filter((service) => service.title && service.description)
    .slice(0, 30);
}

function normalizeProfile(id: string, data: Record<string, unknown>): PublicProfessionalProfile {
  const location = (data.location && typeof data.location === 'object')
    ? data.location as Record<string, unknown>
    : {};

  return {
    id,
    name: normalizeString(data.name, 120) || 'Profesional CONEXA',
    avatar: normalizeString(data.avatar, 1000),
    businessName: normalizeString(data.businessName, 160),
    professionId: typeof data.professionId === 'string' ? data.professionId : null,
    professionName: normalizeString(data.professionName, 160),
    bioPublic: normalizeString(data.bioPublic, 2000),
    specialties: normalizeList(data.specialties, 20, 100),
    description: normalizeString(data.description, 2000),
    workZoneRadiusKm: Math.max(1, Math.min(100, Number(data.workZoneRadiusKm) || 1)),
    workingHours: normalizeString(data.workingHours ?? data.workHours, 200),
    servicesOffered: normalizeServices(data.servicesOffered),
    portfolioImages: normalizeList(data.portfolioImages, 20, 2048),
    location: {
      city: normalizeString(location.city, 120),
      province: normalizeString(location.province, 120),
      country: normalizeString(location.country, 120),
      approxZone: normalizeString(location.approxZone, 160),
    },
    isIdentityVerified: data.isIdentityVerified === true,
    isProfessionalVerified: data.isProfessionalVerified === true,
    rating: Math.max(0, Math.min(5, Number(data.rating) || 0)),
    reviewCount: Math.max(0, Math.floor(Number(data.reviewCount) || 0)),
    jobsCompleted: Math.max(0, Math.floor(Number(data.jobsCompleted) || 0)),
    availabilityStatus: data.availabilityStatus === 'DISPONIBLE' || data.availabilityStatus === 'OCUPADO' || data.availabilityStatus === 'EN_CONSULTA'
      ? data.availabilityStatus
      : 'EN_CONSULTA',
    updatedAt: normalizeString(data.updatedAt, 64) || undefined,
  };
}

export function subscribeToPublicProfessionalProfiles(
  onData: (profiles: PublicProfessionalProfile[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    const error = new Error('FIREBASE_NOT_CONFIGURED');
    onError?.(error);
    return () => undefined;
  }

  const profilesQuery = query(
    collection(db, 'public_professional_profiles'),
    orderBy('updatedAt', 'desc'),
  );

  return onSnapshot(
    profilesQuery,
    (snapshot) => {
      const profiles = snapshot.docs
        .slice(0, MAX_PROFILES)
        .map((doc) => normalizeProfile(doc.id, doc.data() as Record<string, unknown>));
      onData(profiles);
    },
    (error) => onError?.(error instanceof Error ? error : new Error(String(error))),
  );
}

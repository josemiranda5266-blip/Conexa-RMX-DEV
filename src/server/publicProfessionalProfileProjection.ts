import { getAdminDb } from './firebaseAdmin.js';
import type { ServiceItem } from '../types.js';

export interface PublicProfessionalProfileSource {
  id: string;
  name?: unknown;
  avatar?: unknown;
  bioPublic?: unknown;
  businessName?: unknown;
  professionId?: unknown;
  professionName?: unknown;
  specialties?: unknown;
  description?: unknown;
  workZoneRadiusKm?: unknown;
  workingHours?: unknown;
  workHours?: unknown;
  servicesOffered?: unknown;
  portfolioImages?: unknown;
  location?: {
    city?: unknown;
    province?: unknown;
    country?: unknown;
    approxZone?: unknown;
  };
  isIdentityVerified?: unknown;
  isProfessionalVerified?: unknown;
  rating?: unknown;
  reviewCount?: unknown;
  jobsCompleted?: unknown;
  availabilityStatus?: unknown;
}

function boundedString(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function boundedNumber(value: unknown, min: number, max: number, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function boundedInteger(value: unknown, min: number, max: number, fallback = 0): number {
  return Math.floor(boundedNumber(value, min, max, fallback));
}

function normalizeStringList(value: unknown, maxItems: number, maxItemLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => boundedString(item, maxItemLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizePortfolioImages(value: unknown): string[] {
  return normalizeStringList(value, 20, 2048).filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  });
}

function normalizeServices(value: unknown): Array<Pick<ServiceItem, 'id' | 'title' | 'description' | 'approxPriceArs'>> {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Partial<ServiceItem> => typeof item === 'object' && item !== null)
    .map((item, index) => {
      const id = boundedString(item.id, 120) || `service-${index + 1}`;
      const title = boundedString(item.title, 160);
      const description = boundedString(item.description, 1000);
      const rawPrice = item.approxPriceArs;
      const approxPriceArs = rawPrice === undefined
        ? undefined
        : boundedNumber(rawPrice, 0, 100_000_000);

      return {
        id,
        title,
        description,
        ...(approxPriceArs !== undefined ? { approxPriceArs } : {}),
      };
    })
    .filter((service) => service.title && service.description)
    .slice(0, 30);
}

function normalizeAvailability(value: unknown): 'DISPONIBLE' | 'OCUPADO' | 'EN_CONSULTA' {
  return value === 'DISPONIBLE' || value === 'OCUPADO' || value === 'EN_CONSULTA'
    ? value
    : 'EN_CONSULTA';
}

/**
 * Public catalog projection for professional discovery/detail views.
 * Never include email, phone, exact address, credentials, hourlyRateArs,
 * trustScore, role, activeMode, subscription or administrative state here.
 */
export function buildPublicProfessionalProfileDocument(source: PublicProfessionalProfileSource) {
  const id = boundedString(source.id, 256);
  if (!id) throw new Error('USER_ID_REQUIRED');

  const workingHours = boundedString(source.workingHours ?? source.workHours, 200);
  const professionId = boundedString(source.professionId, 120);

  return {
    id,
    name: boundedString(source.name, 120) || 'Profesional CONEXA',
    avatar: boundedString(source.avatar, 1000),
    businessName: boundedString(source.businessName, 160),
    professionId: professionId || null,
    professionName: boundedString(source.professionName, 160),
    bioPublic: boundedString(source.bioPublic, 2000),
    specialties: normalizeStringList(source.specialties, 20, 100),
    description: boundedString(source.description, 2000),
    workZoneRadiusKm: boundedNumber(source.workZoneRadiusKm, 1, 100, 1),
    workingHours,
    servicesOffered: normalizeServices(source.servicesOffered),
    portfolioImages: normalizePortfolioImages(source.portfolioImages),
    location: {
      city: boundedString(source.location?.city, 120),
      province: boundedString(source.location?.province, 120),
      country: boundedString(source.location?.country, 120),
      approxZone: boundedString(source.location?.approxZone, 160),
    },
    isIdentityVerified: source.isIdentityVerified === true,
    isProfessionalVerified: source.isProfessionalVerified === true,
    rating: boundedNumber(source.rating, 0, 5),
    reviewCount: boundedInteger(source.reviewCount, 0, 10_000_000),
    jobsCompleted: boundedInteger(source.jobsCompleted, 0, 10_000_000),
    availabilityStatus: normalizeAvailability(source.availabilityStatus),
  };
}

/** Server-only authoritative projection writer. */
export async function syncPublicProfessionalProfileFromUser(source: PublicProfessionalProfileSource): Promise<void> {
  const firestore = getAdminDb();
  const document = buildPublicProfessionalProfileDocument(source);

  await firestore.collection('public_professional_profiles').doc(document.id).set({
    ...document,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function deletePublicProfessionalProfile(userId: string): Promise<void> {
  const normalizedId = boundedString(userId, 256);
  if (!normalizedId) throw new Error('USER_ID_REQUIRED');
  await getAdminDb().collection('public_professional_profiles').doc(normalizedId).delete();
}

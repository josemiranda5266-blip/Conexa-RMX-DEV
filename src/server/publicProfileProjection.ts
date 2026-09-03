import { getAdminDb } from './firebaseAdmin.js';

export interface PublicProfileSource {
  id: string;
  name?: unknown;
  avatar?: unknown;
  professionName?: unknown;
  bioPublic?: unknown;
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

function normalizeAvailability(value: unknown): 'DISPONIBLE' | 'OCUPADO' | 'EN_CONSULTA' {
  return value === 'DISPONIBLE' || value === 'OCUPADO' || value === 'EN_CONSULTA'
    ? value
    : 'EN_CONSULTA';
}

/**
 * Builds the only server-side projection allowed into `public_profiles`.
 * Sensitive/private fields are intentionally not accepted by this contract.
 */
export function buildPublicProfileDocument(user: PublicProfileSource) {
  const id = boundedString(user.id, 256);
  if (!id) throw new Error('USER_ID_REQUIRED');

  return {
    id,
    name: boundedString(user.name, 120) || 'Usuario CONEXA',
    avatar: boundedString(user.avatar, 1000),
    ...(boundedString(user.professionName, 160) ? { professionName: boundedString(user.professionName, 160) } : {}),
    ...(boundedString(user.bioPublic, 2000) ? { bioPublic: boundedString(user.bioPublic, 2000) } : {}),
    location: {
      city: boundedString(user.location?.city, 120),
      province: boundedString(user.location?.province, 120),
      country: boundedString(user.location?.country, 120),
      approxZone: boundedString(user.location?.approxZone, 160),
    },
    isIdentityVerified: user.isIdentityVerified === true,
    isProfessionalVerified: user.isProfessionalVerified === true,
    rating: boundedNumber(user.rating, 0, 5),
    reviewCount: boundedInteger(user.reviewCount, 0, 10_000_000),
    jobsCompleted: boundedInteger(user.jobsCompleted, 0, 10_000_000),
    availabilityStatus: normalizeAvailability(user.availabilityStatus),
  };
}

/**
 * Authoritative write path. The client must never call this module directly;
 * it is intentionally server-only and uses Firebase Admin credentials.
 */
export async function syncPublicProfileFromUser(user: PublicProfileSource): Promise<void> {
  const firestore = getAdminDb();
  const document = buildPublicProfileDocument(user);
  await firestore.collection('public_profiles').doc(document.id).set({
    ...document,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function deletePublicProfile(userId: string): Promise<void> {
  const normalizedId = boundedString(userId, 256);
  if (!normalizedId) throw new Error('USER_ID_REQUIRED');
  const firestore = getAdminDb();
  await firestore.collection('public_profiles').doc(normalizedId).delete();
}

import { getAdminDb } from './firebaseAdmin.js';
import { normalizeProfessionalProfileWrite, type ProfessionalProfileWriteInput } from './professionalProfilePolicy.js';
import { getProfessionById, getProfessionByName } from '../domain/professionCatalog.js';
import { syncPublicProfessionalProfileFromUser } from './publicProfessionalProfileProjection.js';

export interface SaveProfessionalProfileResult {
  user: Record<string, unknown>;
}

export async function saveProfessionalProfile(
  userId: string,
  input: ProfessionalProfileWriteInput,
): Promise<SaveProfessionalProfileResult> {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) throw new Error('USER_ID_REQUIRED');

  const firestore = getAdminDb();
  const userRef = firestore.collection('users').doc(normalizedUserId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new Error('USER_NOT_FOUND');

  const existing = (userSnap.data() || {}) as Record<string, unknown>;
  if (existing.isBlocked === true) throw new Error('USER_BLOCKED');

  const normalized = normalizeProfessionalProfileWrite(
    input,
    typeof existing.name === 'string' ? existing.name : '',
  );

  const catalogEntry = normalized.professionId
    ? getProfessionById(normalized.professionId)
    : getProfessionByName(normalized.professionName);

  if (!catalogEntry) throw new Error('INVALID_PROFESSION_ID');

  const professionByName = getProfessionByName(normalized.professionName);
  if (professionByName && professionByName.id !== catalogEntry.id) {
    throw new Error('PROFESSION_ID_NAME_MISMATCH');
  }

  const profileFields = {
    professionId: catalogEntry.id,
    professionName: catalogEntry.name,
    businessName: normalized.businessName,
    specialties: normalized.specialties,
    description: normalized.description,
    workZoneRadiusKm: normalized.workZoneRadiusKm,
    workingHours: normalized.workingHours,
    // Keep the legacy field synchronized while consumers migrate to workingHours.
    workHours: normalized.workingHours,
    matriculaOrDegree: normalized.matriculaOrDegree,
    hourlyRateArs: normalized.hourlyRateArs,
    servicesOffered: normalized.servicesOffered,
    portfolioImages: normalized.portfolioImages,
    hasProfessionalProfile: true,
    isProfessional: true,
    hasClientProfile: existing.hasClientProfile !== false,
    availabilityStatus: existing.availabilityStatus || 'DISPONIBLE',
  };

  await userRef.set(profileFields, { merge: true });

  const updatedSnap = await userRef.get();
  const updatedUser = { id: normalizedUserId, ...(updatedSnap.data() || {}) } as Record<string, unknown>;

  await syncPublicProfessionalProfileFromUser(updatedUser as any);

  return { user: updatedUser };
}

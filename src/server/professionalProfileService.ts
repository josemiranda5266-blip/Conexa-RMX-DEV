import { getAdminDb } from './firebaseAdmin.js';
import { normalizeProfessionalProfileWrite, type ProfessionalProfileWriteInput } from './professionalProfilePolicy.js';
import { getProfessionById, getProfessionByName } from '../domain/professionCatalog.js';
import { buildPublicProfessionalProfileDocument } from './publicProfessionalProfileProjection.js';

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
  const publicProfileRef = firestore.collection('public_professional_profiles').doc(normalizedUserId);

  const normalized = normalizeProfessionalProfileWrite(input, '');
  const catalogEntry = normalized.professionId
    ? getProfessionById(normalized.professionId)
    : getProfessionByName(normalized.professionName);

  if (!catalogEntry) throw new Error('INVALID_PROFESSION_ID');

  const professionByName = getProfessionByName(normalized.professionName);
  if (professionByName && professionByName.id !== catalogEntry.id) {
    throw new Error('PROFESSION_ID_NAME_MISMATCH');
  }

  const result = await firestore.runTransaction(async (tx: any) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error('USER_NOT_FOUND');

    const existing = (userSnap.data() || {}) as Record<string, unknown>;
    if (existing.isBlocked === true) throw new Error('USER_BLOCKED');

    const validated = normalizeProfessionalProfileWrite(
      input,
      typeof existing.name === 'string' ? existing.name : '',
    );

    const fields = {
      professionId: catalogEntry.id,
      professionName: catalogEntry.name,
      businessName: validated.businessName,
      specialties: validated.specialties,
      description: validated.description,
      workZoneRadiusKm: validated.workZoneRadiusKm,
      workingHours: validated.workingHours,
      // Keep the legacy field synchronized while consumers migrate to workingHours.
      workHours: validated.workingHours,
      matriculaOrDegree: validated.matriculaOrDegree,
      hourlyRateArs: validated.hourlyRateArs,
      servicesOffered: validated.servicesOffered,
      portfolioImages: validated.portfolioImages,
      hasProfessionalProfile: true,
      isProfessional: true,
      hasClientProfile: existing.hasClientProfile !== false,
      availabilityStatus: existing.availabilityStatus || 'DISPONIBLE',
    };

    const updatedUser = { id: normalizedUserId, ...existing, ...fields };
    const publicDocument = buildPublicProfessionalProfileDocument(updatedUser as any);

    tx.set(userRef, fields, { merge: true });
    tx.set(publicProfileRef, {
      ...publicDocument,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return { user: updatedUser };
  });

  return result;
}

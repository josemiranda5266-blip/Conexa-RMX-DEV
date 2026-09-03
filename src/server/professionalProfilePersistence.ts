import { getAdminDb } from './firebaseAdmin.js';
import { normalizeProfessionalProfileWrite, type ProfessionalProfileWriteInput } from './professionalProfilePolicy.js';
import {
  syncPublicProfessionalProfileFromUser,
  type PublicProfessionalProfileSource,
} from './publicProfessionalProfileProjection.js';

export type ProfessionalProfilePersistenceResult = {
  user: Record<string, unknown>;
};

export async function persistProfessionalProfile(
  userId: string,
  input: ProfessionalProfileWriteInput,
): Promise<ProfessionalProfilePersistenceResult> {
  const normalized = normalizeProfessionalProfileWrite(input);
  const db = getAdminDb();
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    const error = new Error('USER_NOT_FOUND');
    (error as any).code = 'USER_NOT_FOUND';
    throw error;
  }

  const existing = userSnap.data() || {};
  if (existing.isBlocked === true) {
    const error = new Error('USER_BLOCKED');
    (error as any).code = 'USER_BLOCKED';
    throw error;
  }

  const profile = {
    professionId: normalized.professionId || null,
    professionName: normalized.professionName,
    businessName: normalized.businessName || `${normalized.professionName} ${(existing.name || 'Profesional').toString().split(/\s+/)[0]}`,
    specialties: normalized.specialties,
    description: normalized.description,
    workZoneRadiusKm: normalized.workZoneRadiusKm,
    workingHours: normalized.workingHours,
    matriculaOrDegree: normalized.matriculaOrDegree,
    hourlyRateArs: normalized.hourlyRateArs,
    servicesOffered: normalized.servicesOffered,
    portfolioImages: normalized.portfolioImages,
    hasProfessionalProfile: true,
    isProfessional: true,
    hasClientProfile: existing.hasClientProfile !== false,
    availabilityStatus: existing.availabilityStatus || 'DISPONIBLE',
  };

  await userRef.set(profile, { merge: true });
  const updatedSnap = await userRef.get();
  const updatedUser = { id: userId, ...(updatedSnap.data() || {}) } as Record<string, unknown>;

  await syncPublicProfessionalProfileFromUser(updatedUser as PublicProfessionalProfileSource);

  return { user: updatedUser };
}

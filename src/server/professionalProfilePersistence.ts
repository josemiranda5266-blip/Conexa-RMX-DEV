import { getAdminDb } from './firebaseAdmin.js';
import { normalizeProfessionalProfileWrite, type ProfessionalProfileWriteInput } from './professionalProfilePolicy.js';
import { buildPublicProfessionalProfileDocument } from './publicProfessionalProfileProjection.js';

export type ProfessionalProfilePersistenceResult = {
  user: Record<string, unknown>;
};

export async function persistProfessionalProfile(
  userId: string,
  input: ProfessionalProfileWriteInput,
): Promise<ProfessionalProfilePersistenceResult> {
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

  const normalized = normalizeProfessionalProfileWrite(
    input,
    typeof existing.name === 'string' ? existing.name : '',
  );

  const profile = {
    professionId: normalized.professionId || null,
    professionName: normalized.professionName,
    businessName: normalized.businessName,
    specialties: normalized.specialties,
    description: normalized.description,
    workZoneRadiusKm: normalized.workZoneRadiusKm,
    workingHours: normalized.workingHours,
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

  const updatedUser = { id: userId, ...existing, ...profile } as Record<string, unknown>;
  const publicDocument = buildPublicProfessionalProfileDocument(updatedUser as any);

  await db.runTransaction(async (tx: any) => {
    tx.set(userRef, profile, { merge: true });
    tx.set(db.collection('public_professional_profiles').doc(userId), {
      ...publicDocument,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });

  return { user: updatedUser };
}

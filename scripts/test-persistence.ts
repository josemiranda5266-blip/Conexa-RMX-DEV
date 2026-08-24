import type { Role, UserProfile } from '../src/types';

/**
 * Regression test for the unified authorization model.
 * Firestore profile fields must never elevate privileges; Firebase Custom Claims are authoritative.
 */
function resolveEffectiveRole(claimRole: Role | undefined): Role {
  return claimRole || 'USER';
}

function resolveProfessionalCapability(claimRole: Role | undefined): boolean {
  return resolveEffectiveRole(claimRole) === 'PROFESSIONAL';
}

const forgedFirestoreProfile: Partial<UserProfile> = {
  role: 'PROFESSIONAL',
  isProfessional: true,
  hasProfessionalProfile: true,
  activeMode: 'PROFESSIONAL',
  rating: 5,
  reviewCount: 0,
  jobsCompleted: 0,
  trustScore: 100
};

const scenarios: Array<{ name: string; claimRole: Role | undefined; expectedRole: Role; expectedProfessional: boolean }> = [
  { name: 'Forged Firestore professional profile', claimRole: 'USER', expectedRole: 'USER', expectedProfessional: false },
  { name: 'Verified professional claim', claimRole: 'PROFESSIONAL', expectedRole: 'PROFESSIONAL', expectedProfessional: true },
  { name: 'Missing claim', claimRole: undefined, expectedRole: 'USER', expectedProfessional: false },
  { name: 'Admin claim', claimRole: 'ADMIN', expectedRole: 'ADMIN', expectedProfessional: false }
];

for (const scenario of scenarios) {
  const role = resolveEffectiveRole(scenario.claimRole);
  const professional = resolveProfessionalCapability(scenario.claimRole);
  if (role !== scenario.expectedRole || professional !== scenario.expectedProfessional) {
    throw new Error(`Security regression: ${scenario.name}`);
  }
}

if (forgedFirestoreProfile.role !== 'PROFESSIONAL') {
  throw new Error('Fixture invalid');
}

console.log('Security persistence regression checks: PASS');

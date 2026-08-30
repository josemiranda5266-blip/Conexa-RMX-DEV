import assert from 'node:assert';
import { isUserCandidateProfessional } from './professionalEligibility';
import { User } from '../types';

console.log('Running professionalEligibility domain tests...');

// Case 1: null or undefined
assert.strictEqual(isUserCandidateProfessional(null), false, 'null should return false');
assert.strictEqual(isUserCandidateProfessional(undefined), false, 'undefined should return false');
assert.strictEqual(isUserCandidateProfessional({}), false, 'empty object should return false');

// Case 2: isProfessional = true
const userIsPro: Partial<User> = { isProfessional: true, role: 'CLIENT' };
assert.strictEqual(isUserCandidateProfessional(userIsPro), true, 'isProfessional=true should return true');

// Case 3: hasProfessionalProfile = true (Unified Account in CLIENT mode)
const unifiedClient: Partial<User> = { hasProfessionalProfile: true, role: 'CLIENT' };
assert.strictEqual(isUserCandidateProfessional(unifiedClient), true, 'hasProfessionalProfile=true in CLIENT mode should return true');

// Case 4: hasProfessionalProfile = true (Unified Account with non-professional role)
const unifiedUser: Partial<User> = { hasProfessionalProfile: true, role: 'CLIENT' };
assert.strictEqual(isUserCandidateProfessional(unifiedUser), true, 'hasProfessionalProfile=true in CLIENT mode should return true');

// Case 5: role = 'PROFESSIONAL'
const legacyPro: Partial<User> = { role: 'PROFESSIONAL' };
assert.strictEqual(isUserCandidateProfessional(legacyPro), true, 'role=PROFESSIONAL should return true');

// Case 6: Standard Client with no pro flags
const standardClient: Partial<User> = { role: 'CLIENT', isProfessional: false, hasProfessionalProfile: false };
assert.strictEqual(isUserCandidateProfessional(standardClient), false, 'standard client should return false');

// Case 7: Contradictory Case (isProfessional=false, hasProfessionalProfile=true, role='CLIENT')
const contradictory: Partial<User> = { isProfessional: false, hasProfessionalProfile: true, role: 'CLIENT' };
assert.strictEqual(isUserCandidateProfessional(contradictory), true, 'hasProfessionalProfile=true overrides isProfessional=false');

console.log('✅ All professionalEligibility domain tests passed successfully!');

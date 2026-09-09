import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveEffectiveUserIdentity } from '../src/domain/effectiveUserIdentity';

test('Firestore cannot elevate a USER claim to ADMIN or SUPER_ADMIN', () => {
  const identity = resolveEffectiveUserIdentity(
    { uid: 'u-1', role: 'USER' },
    { role: 'ADMIN', activeMode: 'ADMIN' },
  );

  assert.equal(identity.role, 'USER');
  assert.equal(identity.activeMode, 'CLIENT');
});

test('professional capability is independent from security role', () => {
  const identity = resolveEffectiveUserIdentity(
    { uid: 'u-2', role: 'USER' },
    {
      role: 'PROFESSIONAL',
      hasProfessionalProfile: true,
      activeMode: 'PROFESSIONAL',
    },
  );

  assert.equal(identity.role, 'USER');
  assert.equal(identity.hasProfessionalProfile, true);
  assert.equal(identity.isProfessional, true);
  assert.equal(identity.activeMode, 'PROFESSIONAL');
});

test('ADMIN claim controls admin mode regardless of profile role', () => {
  const identity = resolveEffectiveUserIdentity(
    { uid: 'u-3', role: 'ADMIN' },
    { role: 'USER', activeMode: 'CLIENT' },
  );

  assert.equal(identity.role, 'ADMIN');
  assert.equal(identity.activeMode, 'ADMIN');
});

test('professional capability can be inferred from profession metadata', () => {
  const identity = resolveEffectiveUserIdentity(
    { uid: 'u-4', role: 'USER' },
    { professionName: 'Plomero', activeMode: 'PROFESSIONAL' },
  );

  assert.equal(identity.role, 'USER');
  assert.equal(identity.hasProfessionalProfile, true);
  assert.equal(identity.activeMode, 'PROFESSIONAL');
});

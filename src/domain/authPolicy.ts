export const APP_ROLES = ['USER', 'PROFESSIONAL', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'] as const;
export type AppRole = typeof APP_ROLES[number];

export interface VerifiedIdentity {
  uid: string;
  role: AppRole;
  isAdmin: boolean;
}

export function normalizeRole(value: unknown): AppRole {
  if (value === 'PROFESSIONAL' || value === 'MODERATOR' || value === 'ADMIN' || value === 'SUPER_ADMIN') {
    return value;
  }
  return 'USER';
}

/**
 * Application authorization policy.
 * Operator/webhook secrets are deliberately NOT accepted as Firebase user identity.
 * They must be validated by endpoint-specific S2S/webhook guards instead.
 */
export function identityFromClaims(uid: string, claims: Record<string, unknown>): VerifiedIdentity {
  const role = normalizeRole(claims.role);
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  return { uid, role, isAdmin };
}

export function requireRole(identity: VerifiedIdentity, ...allowed: AppRole[]): void {
  if (!allowed.includes(identity.role)) {
    throw new Error('FORBIDDEN_ROLE');
  }
}

export function requireAdmin(identity: VerifiedIdentity): void {
  if (!identity.isAdmin) {
    throw new Error('ADMIN_REQUIRED');
  }
}

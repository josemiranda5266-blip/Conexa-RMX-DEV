export interface CanonicalIdentity {
  userId: string;
  email?: string;
}

/** Firebase Auth UID is the only canonical cross-domain identity key. */
export function canonicalUserId(uid: string): string {
  const value = uid.trim();
  if (!value) throw new Error('Firebase UID is required');
  return value;
}

export function sameIdentity(left: string, right: string): boolean {
  return canonicalUserId(left) === canonicalUserId(right);
}

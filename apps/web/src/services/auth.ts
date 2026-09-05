import { onAuthStateChanged, type User } from 'firebase/auth';
import { firebaseAuth } from './firebaseClient';

export function subscribeToAuth(listener: (user: User | null) => void): () => void {
  if (!firebaseAuth) {
    listener(null);
    return () => undefined;
  }
  return onAuthStateChanged(firebaseAuth, listener);
}

export function getCurrentUser(): User | null {
  return firebaseAuth?.currentUser ?? null;
}

export async function getIdToken(): Promise<string | null> {
  const user = getCurrentUser();
  return user ? user.getIdToken() : null;
}

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let db: Firestore | undefined;

function parseServiceAccount(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    try {
      return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as Record<string, unknown>;
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT must be valid JSON or Base64-encoded JSON');
    }
  }
}

function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) { app = getApps()[0]; return app; }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is required for Nexora API');
  const serviceAccount = parseServiceAccount(raw);
  app = initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) });
  return app;
}

export function getDb(): Firestore {
  if (!db) db = getFirestore(getAdminApp());
  return db;
}

import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let firebaseAdminApp: App | null = null;
let cachedDatabaseId: string | null = null;

export function getFirebaseAdmin(): App | null {
  if (firebaseAdminApp) return firebaseAdminApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseAdminApp = getApp();
    return firebaseAdminApp;
  }

  const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST?.trim();
  const emulatorProjectId = (
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim()
  );

  // Safe emulator path: only a demo-* project with an explicit emulator host.
  // Firebase recommends demo projects for emulator tests, and the Admin SDK
  // automatically routes Firestore to FIRESTORE_EMULATOR_HOST.
  if (
    firestoreEmulatorHost &&
    /^demo-[a-z0-9-]+$/i.test(emulatorProjectId || '')
  ) {
    try {
      firebaseAdminApp = initializeApp({ projectId: emulatorProjectId });
      return firebaseAdminApp;
    } catch (error: any) {
      console.error('[FIREBASE ADMIN] Emulator initialization failed:', error?.message || error);
      return null;
    }
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  let credential: ReturnType<typeof cert> | ReturnType<typeof applicationDefault> | null = null;

  if (serviceAccount) {
    try {
      const parsed = serviceAccount.startsWith('{')
        ? JSON.parse(serviceAccount)
        : JSON.parse(Buffer.from(serviceAccount, 'base64').toString('utf8'));
      credential = cert(parsed);
    } catch (error: any) {
      console.error('[FIREBASE ADMIN] Invalid FIREBASE_SERVICE_ACCOUNT:', error?.message || error);
    }
  }

  if (!credential && credentialsPath) {
    try {
      credential = applicationDefault();
    } catch (error: any) {
      console.error('[FIREBASE ADMIN] GOOGLE_APPLICATION_CREDENTIALS unavailable:', error?.message || error);
    }
  }

  if (!credential) {
    try {
      credential = applicationDefault();
    } catch {
      // Application Default Credentials are unavailable.
    }
  }

  if (!credential) return null;

  try {
    firebaseAdminApp = initializeApp({ credential });
    return firebaseAdminApp;
  } catch (error: any) {
    console.error('[FIREBASE ADMIN] Initialization failed:', error?.message || error);
    return null;
  }
}

function getFirestoreDatabaseId(): string {
  if (cachedDatabaseId !== null) return cachedDatabaseId;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (typeof parsed.firestoreDatabaseId === 'string' && parsed.firestoreDatabaseId.trim()) {
        const databaseId = parsed.firestoreDatabaseId.trim();
        cachedDatabaseId = databaseId;
        return databaseId;
      }
    }
  } catch (error: any) {
    console.error('[FIREBASE ADMIN] Error reading firestoreDatabaseId:', error?.message || error);
  }
  return '(default)';
}

export function getAdminDb(): ReturnType<typeof getAdminFirestore> {
  const app = getFirebaseAdmin();
  if (!app) {
    const error = new Error('FIREBASE_ADMIN_NOT_INITIALIZED');
    (error as any).code = 'FIREBASE_ADMIN_NOT_INITIALIZED';
    throw error;
  }

  const databaseId = getFirestoreDatabaseId();
  return databaseId !== '(default)'
    ? getAdminFirestore(app, databaseId)
    : getAdminFirestore(app);
}

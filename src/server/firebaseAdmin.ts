import * as adminModule from 'firebase-admin';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const firebaseAdmin: any = (adminModule as any).default || adminModule;
let firebaseAdminApp: any = null;
let cachedDatabaseId: string | null = null;

export function getFirebaseAdmin(): any {
  if (firebaseAdminApp) return firebaseAdminApp;
  if (firebaseAdmin.apps && firebaseAdmin.apps.length > 0) {
    firebaseAdminApp = firebaseAdmin.apps[0];
    return firebaseAdminApp;
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  let credential: any = null;

  if (serviceAccount) {
    try {
      const parsed = serviceAccount.startsWith('{')
        ? JSON.parse(serviceAccount)
        : JSON.parse(Buffer.from(serviceAccount, 'base64').toString('utf8'));
      credential = firebaseAdmin.cert(parsed);
    } catch (error: any) {
      console.error('[FIREBASE ADMIN] Invalid FIREBASE_SERVICE_ACCOUNT:', error?.message || error);
    }
  }

  if (!credential && credentialsPath) {
    try {
      credential = firebaseAdmin.applicationDefault();
    } catch (error: any) {
      console.error('[FIREBASE ADMIN] GOOGLE_APPLICATION_CREDENTIALS unavailable:', error?.message || error);
    }
  }

  if (!credential) {
    try {
      credential = firebaseAdmin.applicationDefault();
    } catch {
      // Application Default Credentials are unavailable.
    }
  }

  if (!credential) return null;

  try {
    firebaseAdminApp = firebaseAdmin.initializeApp({ credential });
    return firebaseAdminApp;
  } catch (error: any) {
    console.error('[FIREBASE ADMIN] Initialization failed:', error?.message || error);
    return null;
  }
}

function getFirestoreDatabaseId(): string {
  if (cachedDatabaseId) return cachedDatabaseId;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (typeof parsed.firestoreDatabaseId === 'string' && parsed.firestoreDatabaseId.trim()) {
        cachedDatabaseId = parsed.firestoreDatabaseId.trim();
        return cachedDatabaseId;
      }
    }
  } catch (error: any) {
    console.error('[FIREBASE ADMIN] Error reading firestoreDatabaseId:', error?.message || error);
  }
  return '(default)';
}

export function getAdminDb(): any {
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

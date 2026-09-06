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

  const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST?.trim();
  const emulatorProjectId = (
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim()
  );

  // Safe emulator path: only a demo-* project with an explicit emulator host.
  // Firebase recommends demo projects for emulator tests, and the Admin SDK
  // automatically routes Firestore to FIRESTORE_EMULATOR_HOST.
  if (firestoreEmulatorHost) {
    if (!emulatorProjectId?.startsWith('demo-')) {
      throw new Error('FIRESTORE_EMULATOR_REQUIRES_DEMO_PROJECT');
    }
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credential = serviceAccountJson
    ? firebaseAdmin.credential.cert(JSON.parse(serviceAccountJson))
    : firebaseAdmin.credential.applicationDefault();

  try {
    firebaseAdminApp = firebaseAdmin.initializeApp({ credential });
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

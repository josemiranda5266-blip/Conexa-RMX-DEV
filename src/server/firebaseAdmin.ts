import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let firebaseAdminApp: admin.app.App | null = null;
let cachedDatabaseId: string | null = null;

function getFirebaseAdmin(): admin.app.App | null {
  if (firebaseAdminApp) return firebaseAdminApp;

  const credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
    : admin.credential.applicationDefault();

  if (!credential) return null;

  try {
    firebaseAdminApp = admin.initializeApp({ credential });
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

export function getAdminDb(): any {
  const app = getFirebaseAdmin();
  if (!app) {
    throw new Error('FIREBASE_ADMIN_NOT_INITIALIZED');
  }

  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || app.options.projectId;

  if (emulatorHost && projectId?.startsWith('demo-')) {
    return admin.firestore(app);
  }

  return admin.firestore(app);
}

export { getFirestoreDatabaseId };

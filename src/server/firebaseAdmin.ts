import * as adminModule from 'firebase-admin';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

const firebaseAdmin: any = (adminModule as any).default || adminModule;
let firebaseAdminApp: any = null;

export function getFirebaseAdmin(): any {
  if (firebaseAdminApp) return firebaseAdminApp;
  if (firebaseAdmin.apps && firebaseAdmin.apps.length > 0) {
    firebaseAdminApp = firebaseAdmin.apps[0];
    return firebaseAdminApp;
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
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

export function getAdminDb(): any {
  const app = getFirebaseAdmin();
  if (!app) {
    const error = new Error('FIREBASE_ADMIN_NOT_INITIALIZED');
    (error as any).code = 'FIREBASE_ADMIN_NOT_INITIALIZED';
    throw error;
  }
  return getAdminFirestore(app);
}

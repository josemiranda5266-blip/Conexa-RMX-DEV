import { getFirestore } from 'firebase-admin/firestore';
import type { FirebaseAdminProvider } from '../auth.js';
import type { MercadoPagoOAuthConnection } from './mercadoPagoOAuthTokenStore.js';

const COLLECTION = 'mercado_pago_connections';
const STATES = 'mercado_pago_oauth_states';

export function getPaymentDb(getAdminApp: FirebaseAdminProvider) {
  const app = getAdminApp();
  if (!app) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  return getFirestore(app);
}

export async function reserveOAuthState(getAdminApp: FirebaseAdminProvider, merchantId: string, nonce: string, expiresAt: string) {
  const db = getPaymentDb(getAdminApp);
  await db.collection(STATES).doc(nonce).set({ merchantId, expiresAt, createdAt: new Date().toISOString() });
}

export async function consumeOAuthState(getAdminApp: FirebaseAdminProvider, merchantId: string, nonce: string) {
  const db = getPaymentDb(getAdminApp);
  const ref = db.collection(STATES).doc(nonce);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('OAUTH_STATE_NOT_FOUND');
    const data = snap.data() || {};
    if (data.merchantId !== merchantId) throw new Error('OAUTH_STATE_MERCHANT_MISMATCH');
    if (!data.expiresAt || Date.parse(String(data.expiresAt)) <= Date.now()) throw new Error('OAUTH_STATE_EXPIRED');
    tx.delete(ref);
    return true;
  });
}

export async function saveOAuthConnection(getAdminApp: FirebaseAdminProvider, connection: MercadoPagoOAuthConnection) {
  const db = getPaymentDb(getAdminApp);
  await db.collection(COLLECTION).doc(connection.merchantId).set(connection, { merge: true });
}

export async function getOAuthConnection(getAdminApp: FirebaseAdminProvider, merchantId: string) {
  const db = getPaymentDb(getAdminApp);
  const snap = await db.collection(COLLECTION).doc(merchantId).get();
  return snap.exists ? (snap.data() as MercadoPagoOAuthConnection) : null;
}

import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const requiredEnv = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

type FirebaseEnvKey = (typeof requiredEnv)[number];

function readConfig(): Record<FirebaseEnvKey, string> | null {
  const values = Object.fromEntries(requiredEnv.map((key) => [key, import.meta.env[key]])) as Record<FirebaseEnvKey, string | undefined>;
  return requiredEnv.every((key) => typeof values[key] === 'string' && values[key])
    ? values as Record<FirebaseEnvKey, string>
    : null;
}

const config = readConfig();
export const firebaseConfigured = config !== null;

const app = config
  ? (getApps()[0] ?? initializeApp({
      apiKey: config.VITE_FIREBASE_API_KEY,
      authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: config.VITE_FIREBASE_PROJECT_ID,
      storageBucket: config.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: config.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: config.VITE_FIREBASE_APP_ID,
    }))
  : null;

export const firebaseAuth = app ? getAuth(app) : null;

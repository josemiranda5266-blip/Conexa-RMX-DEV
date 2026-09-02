import crypto from "crypto";
import type { Request } from "express";
import type { Auth } from "firebase-admin/auth";
import { getAuth } from "firebase-admin/auth";
import { cert, getApps, initializeApp, applicationDefault, type App } from "firebase-admin/app";
import { normalizeRole, type AppRole } from "../domain/authPolicy.js";

export type FirebaseAdminProvider = () => any | null;

export type VerifiedIdentity = {
  isAuthenticated: true;
  isAdmin: boolean;
  userId: string;
  role: AppRole;
};

export type AuthFailure = {
  isAuthenticated: false;
  isAdmin: false;
  errorReason:
    | "MISSING_BEARER_TOKEN"
    | "EMPTY_TOKEN"
    | "FIREBASE_ADMIN_NOT_CONFIGURED"
    | "INVALID_FIREBASE_ID_TOKEN"
    | "INVALID_APPLICATION_ROLE";
};

export type VerifiedAuth = VerifiedIdentity | AuthFailure;

function getFirebaseAuth(getAdminApp: FirebaseAdminProvider): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

/**
 * User authentication is intentionally based only on a Firebase ID token.
 * Operator/webhook secrets MUST NOT become a user identity or SUPER_ADMIN claim.
 */
export async function verifyUserAuthToken(
  req: Request,
  getAdminApp: FirebaseAdminProvider
): Promise<VerifiedAuth> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { isAuthenticated: false, isAdmin: false, errorReason: "MISSING_BEARER_TOKEN" };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return { isAuthenticated: false, isAdmin: false, errorReason: "EMPTY_TOKEN" };
  }

  const auth = getFirebaseAuth(getAdminApp);
  if (!auth) {
    return { isAuthenticated: false, isAdmin: false, errorReason: "FIREBASE_ADMIN_NOT_CONFIGURED" };
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const roleClaim = decoded.role;
    const role = normalizeRole(roleClaim);

    // Unknown role claims are rejected instead of silently becoming USER.
    if (roleClaim !== undefined && roleClaim !== role) {
      return { isAuthenticated: false, isAdmin: false, errorReason: "INVALID_APPLICATION_ROLE" };
    }

    return {
      isAuthenticated: true,
      isAdmin: role === "ADMIN" || role === "SUPER_ADMIN",
      userId: decoded.uid,
      role
    };
  } catch {
    return { isAuthenticated: false, isAdmin: false, errorReason: "INVALID_FIREBASE_ID_TOKEN" };
  }
}

/**
 * Compatibility entry point for the legacy server bootstrap. It reuses the
 * already initialized default Firebase Admin app when available, otherwise
 * initializes it from the same supported server-side credential sources.
 * It never accepts client-supplied credentials.
 */
function getDefaultFirebaseAdminApp(): App | null {
  const existing = getApps()[0];
  if (existing) return existing;

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (serviceAccountEnv) {
    try {
      const parsed = serviceAccountEnv.startsWith("{")
        ? JSON.parse(serviceAccountEnv)
        : JSON.parse(Buffer.from(serviceAccountEnv, "base64").toString("utf8"));
      return initializeApp({ credential: cert(parsed) });
    } catch {
      // Fall through to Application Default Credentials.
    }
  }

  try {
    return initializeApp({ credential: applicationDefault() });
  } catch {
    return null;
  }
}

/**
 * Legacy one-argument auth helper retained for the current server entrypoint.
 * New code should prefer verifyUserAuthToken with dependency injection.
 */
export async function verifyAuthToken(req: Request): Promise<VerifiedAuth> {
  return verifyUserAuthToken(req, getDefaultFirebaseAdminApp);
}

/**
 * Server-to-server/operator authentication is deliberately separate from
 * user authentication and can never produce a Firebase user identity.
 */
export function verifyS2SSecret(
  req: Request,
  expectedSecret: string | undefined,
  acceptedHeaders: string[] = ["x-radar-secret"]
): boolean {
  if (!expectedSecret) return false;
  for (const headerName of acceptedHeaders) {
    const presented = req.headers[headerName];

    if (typeof presented !== "string") continue;

    const presentedBuffer = Buffer.from(presented);
    const expectedBuffer = Buffer.from(expectedSecret);

    if (presentedBuffer.length !== expectedBuffer.length) continue;

    if (crypto.timingSafeEqual(presentedBuffer, expectedBuffer)) {
      return true;
    }
  }

  return false;
}

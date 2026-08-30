import crypto from "crypto";
import type { Request } from "express";
import type { Auth } from "firebase-admin/auth";
import { getAuth } from "firebase-admin/auth";
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

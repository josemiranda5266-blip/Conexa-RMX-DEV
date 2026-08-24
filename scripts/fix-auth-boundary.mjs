import fs from "node:fs";

const file = "server.ts";
const source = fs.readFileSync(file, "utf8");

const importLine = 'import { verifyUserAuthToken } from "./src/server/auth.js";';
if (!source.includes(importLine)) {
  const anchor = 'import { validateMercadoPagoEnv } from "./src/lib/envValidation.js";';
  if (!source.includes(anchor)) throw new Error("AUTH_REPAIR: import anchor not found");
  source = source.replace(anchor, `${anchor}\n${importLine}`);
}

const startMarker = "  // Centralized Auth Verification & Middleware\n";
const endMarker = "  // ==========================================\n  // MERCADO PAGO MARKETPLACE - OAuth + Checkout Pro\n";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start < 0 || end < 0 || end <= start) {
  throw new Error("AUTH_REPAIR: centralized verifyAuthToken block not found");
}

const replacement = `  // Centralized Auth Verification & Middleware\n  // IMPORTANT: user authentication is Firebase-ID-token-only.\n  // S2S/operator secrets are handled separately by verifyS2SSecret() in src/server/auth.ts\n  // and MUST NEVER create a user identity or SUPER_ADMIN session.\n  async function verifyAuthToken(req: Request): Promise<{\n    isAuthenticated: boolean;\n    isAdmin: boolean;\n    userId?: string;\n    role?: string;\n    errorReason?: string;\n  }> {\n    return verifyUserAuthToken(req, getFirebaseAdmin);\n  }\n\n`;

const repaired = source.slice(0, start) + replacement + source.slice(end);

if (/x-admin-key|admin_secret_operator|ADMIN_SECRET_KEY.*RADAR_WEBHOOK_SECRET/.test(repaired.slice(start, start + replacement.length))) {
  throw new Error("AUTH_REPAIR: operator-secret bypass remains in verifyAuthToken");
}

fs.writeFileSync(file, repaired, "utf8");
console.log("AUTH_REPAIR: server.ts centralized auth verifier replaced successfully.");

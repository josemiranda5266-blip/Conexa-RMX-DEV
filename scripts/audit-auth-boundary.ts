import fs from "node:fs";
import path from "node:path";

const serverPath = path.resolve(process.cwd(), "server.ts");
const authPath = path.resolve(process.cwd(), "src/server/auth.ts");
const policyPath = path.resolve(process.cwd(), "src/domain/authPolicy.ts");

const server = fs.readFileSync(serverPath, "utf8");
const auth = fs.readFileSync(authPath, "utf8");
const policy = fs.readFileSync(policyPath, "utf8");

const failures: string[] = [];

// The current server must not retain the legacy privilege-escalation path.
if (/adminKeyHeader\s*=|x-admin-key.*x-radar-secret|admin_secret_operator|role:\s*['\"]SUPER_ADMIN['\"]/.test(server)) {
  failures.push("server.ts todavía contiene el bypass de secretos de operador dentro de verifyAuthToken().");
}

if (!auth.includes("verifyUserAuthToken") || !auth.includes("verifyS2SSecret")) {
  failures.push("Falta la separación explícita entre autenticación de usuario y S2S.");
}

if (!auth.includes("timingSafeEqual")) {
  failures.push("El guard S2S no usa comparación timing-safe.");
}

if (!policy.includes("APP_ROLES") || !policy.includes("SUPER_ADMIN")) {
  failures.push("La política canónica de roles no está presente.");
}

if (failures.length) {
  console.error("AUTH BOUNDARY AUDIT: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AUTH BOUNDARY AUDIT: PASS");
console.log("- Roles canónicos detectados");
console.log("- User auth y S2S auth separados");
console.log("- Comparación timing-safe presente");

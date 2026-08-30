import fs from 'node:fs';
import crypto from 'node:crypto';

const target = process.argv[2] ?? 'server.ts';
const text = fs.readFileSync(target, 'utf8');
const sha256 = crypto.createHash('sha256').update(text, 'utf8').digest('hex');

const requiredMarkers = [
  'async function verifyAuthToken',
  "x-admin-key",
  "x-radar-secret",
  "RADAR_WEBHOOK_SECRET",
  "MP_WEBHOOK_SECRET",
];

for (const marker of requiredMarkers) {
  if (!text.includes(marker)) {
    throw new Error(`ABORT: expected marker not found: ${marker}`);
  }
}

if (text.includes('verifyUserAuthToken') && text.includes('LEGACY_ADMIN_SECRET_BYPASS_REMOVED')) {
  throw new Error('ABORT: server.ts already appears hardened; refusing a second rewrite');
}

const adminBypass = /\n?\s*const adminKeyHeader\s*=\s*req\.headers\[['\"]x-admin-key['\"]\]\s*\|\|\s*req\.headers\[['\"]x-radar-secret['\"]\];[\s\S]*?\n\s*}\s*\n/;

if (!adminBypass.test(text)) {
  throw new Error('ABORT: legacy admin/radar secret bypass block did not match exactly');
}

const replacement = `\n  // LEGACY_ADMIN_SECRET_BYPASS_REMOVED\n  // Administrative identity is derived exclusively from the verified Firebase ID token.\n  // S2S/webhook secrets must be validated by dedicated guards and never mint a user role.\n`;

const hardened = text.replace(adminBypass, replacement);

if (hardened === text) {
  throw new Error('ABORT: no change produced');
}

if (/x-admin-key.*SUPER_ADMIN|x-radar-secret.*SUPER_ADMIN/s.test(hardened)) {
  throw new Error('ABORT: secret-to-SUPER_ADMIN path still detected');
}

const out = `${hardened.endsWith('\n') ? hardened : `${hardened}\n`}`;
fs.writeFileSync(target, out, 'utf8');

const outSha256 = crypto.createHash('sha256').update(out, 'utf8').digest('hex');
console.log(JSON.stringify({ target, inputSha256: sha256, outputSha256: outSha256, changed: true }));

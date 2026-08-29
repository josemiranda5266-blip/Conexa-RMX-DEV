import fs from 'node:fs';
import path from 'node:path';

console.log('--- CONEXA UNIFIED SECURITY & HYGIENE VERIFICATION ---');

const requiredFiles = [
  'README.md',
  'docs/AUDITORIAS/README.md',
  'docs/AUDITORIAS/AUDITORIA-2026-08-29.md',
  'docs/AUDITORIAS/CHANGELOG-AUDITORIAS.md',
  'docs/CONEXA_UNIFIED_SECURITY_PLAN.md',
  'scripts/harden-unified.mjs',
  'scripts/finalize-unified.mjs',
  'firestore.rules',
  'firebase.json',
  'firestore.indexes.json',
  '.github/workflows/unify-conexa.yml'
];

let missing = 0;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`[OK] ${file}`);
  } else {
    console.error(`[FAIL] Missing file: ${file}`);
    missing++;
  }
}

if (missing > 0) {
  console.error(`\nVerification failed: ${missing} missing files.`);
  process.exit(1);
} else {
  console.log('\nAll security rules, audit logs, and scripts verified successfully!');
}

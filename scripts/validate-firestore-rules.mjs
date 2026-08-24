import fs from 'node:fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');
const required = [
  "match /users/{userId}",
  "match /service_requests/{requestId}",
  "match /quotes/{quoteId}",
  "match /transactions/{transactionId}",
  "match /conversations/{conversationId}",
  "match /messages/{messageId}",
  "match /reviews/{reviewId}",
  "match /verifications/{verifId}",
  "match /admin_audit_logs/{logId}"
];

for (const marker of required) {
  if (!rules.includes(marker)) throw new Error(`Missing Firestore rule block: ${marker}`);
}

if (!rules.includes("match /{document=**} { allow read, write: if false; }")) {
  throw new Error('Global Firestore deny-by-default guard is missing.');
}

if (rules.includes('allow read, write: if true')) {
  throw new Error('Overly permissive Firestore rule detected.');
}

if (!rules.includes("request.auth.token.role == 'ADMIN'")) {
  throw new Error('Admin authorization must use Firebase custom claims.');
}

console.log('Firestore rule structural checks: PASS');

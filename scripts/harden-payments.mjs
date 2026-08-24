import fs from 'node:fs';

const path = 'server.ts';
let server = fs.readFileSync(path, 'utf8');

function replaceOnce(regex, replacement, label) {
  if (!regex.test(server)) {
    if (typeof replacement === 'string' && server.includes(replacement.trim().slice(0, 80))) return;
    throw new Error(`Payment hardening pattern not found: ${label}`);
  }
  server = server.replace(regex, replacement);
}

replaceOnce(
  /      const transaction = txSnap\.data\(\) \|\| \{\};\n      if \(transaction\.clientId !== auth\.userId\) return res\.status\(403\)\.json\(\{ error: 'FORBIDDEN' \}\);\n      if \(transaction\.status !== 'PAYMENT_PENDING'\) return res\.status\(409\)\.json\(\{ error: 'TRANSACTION_NOT_PAYABLE' \}\);/,
  `      const transaction = txSnap.data() || {};
      if (transaction.clientId !== auth.userId) return res.status(403).json({ error: 'FORBIDDEN' });
      if (!['PAYMENT_PENDING', 'CHECKOUT_CREATED'].includes(String(transaction.status))) return res.status(409).json({ error: 'TRANSACTION_NOT_PAYABLE' });
      if (transaction.mercadoPagoPreferenceId && transaction.mercadoPagoInitPoint) {
        return res.json({ success: true, transactionId: transaction.id, preferenceId: transaction.mercadoPagoPreferenceId, initPoint: transaction.mercadoPagoInitPoint, sandboxInitPoint: transaction.mercadoPagoSandboxInitPoint || null });
      }`,
  'checkout idempotency guard'
);

replaceOnce(
  /await txRef\.update\(\{ mercadoPagoPreferenceId: preference\.id, status: 'PAYMENT_PENDING', paymentCheckoutCreatedAt: new Date\(\)\.toISOString\(\) \}\);/,
  "await txRef.update({ mercadoPagoPreferenceId: preference.id, mercadoPagoInitPoint: preference.init_point || null, mercadoPagoSandboxInitPoint: preference.sandbox_init_point || null, status: 'CHECKOUT_CREATED', paymentCheckoutCreatedAt: new Date().toISOString() });",
  'persist checkout init point'
);

replaceOnce(
  /      if \(payment\.transaction_amount && Number\(payment\.transaction_amount\) < Number\(transactionData\.amountArs\)\) \{\n        console\.warn\('\[MP Webhook\] Paid amount lower than required transaction amount'\);\n        return res\.status\(200\)\.send\('ok'\);\n      \}/,
  `      if (String(payment.currency_id || 'ARS') !== String(transactionData.currency || 'ARS')) {
        console.warn('[MP Webhook] Currency mismatch');
        return res.status(200).send('ok');
      }
      if (Number(payment.transaction_amount) !== Number(transactionData.amountArs)) {
        console.warn('[MP Webhook] Paid amount does not match canonical transaction amount');
        return res.status(200).send('ok');
      }
      if (String(payment.external_reference || '') !== String(transactionData.id)) {
        console.warn('[MP Webhook] Missing or mismatched canonical external reference');
        return res.status(200).send('ok');
      }`,
  'strict payment reconciliation'
);

replaceOnce(
  /      const reviewId = `review-\$\{Date\.now\(\)\}-\$\{crypto\.randomBytes\(5\)\.toString\('hex'\)\}`;\n      const review = \{/,
  '      const reviewId = `review-${txDoc.id}`;\n      const reviewRef = db.collection(\'reviews\').doc(reviewId);\n      const review = {',
  'deterministic review id'
);
replaceOnce(
  /      batch\.set\(db\.collection\('reviews'\)\.doc\(reviewId\), review\);/,
  '      batch.create(reviewRef, review);',
  'atomic review creation'
);

fs.writeFileSync(path, server);
console.log('Payment hardening patches applied successfully.');

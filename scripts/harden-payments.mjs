import fs from 'node:fs';

const path = 'server.ts';
let server = fs.readFileSync(path, 'utf8');

function replaceOnce(regex, replacement, label) {
  if (!regex.test(server)) throw new Error(`Payment hardening pattern not found: ${label}`);
  server = server.replace(regex, replacement);
}

replaceOnce(
  /      if \(transaction\.clientId !== auth\.userId\) return res\.status\(403\)\.json\(\{ error: 'FORBIDDEN' \}\);\n      if \(transaction\.status !== 'PAYMENT_PENDING'\) return res\.status\(409\)\.json\(\{ error: 'TRANSACTION_NOT_PAYABLE' \}\);/,
  `      if (transaction.clientId !== auth.userId) return res.status(403).json({ error: 'FORBIDDEN' });
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
  /      const update: any = \{ mercadoPagoPaymentId: paymentId, paymentStatus: payment\.status, paymentUpdatedAt: new Date\(\)\.toISOString\(\) \};\n      if \(payment\.status === 'approved'\) \{ update\.status = 'PAID'; update\.paidAt = new Date\(\)\.toISOString\(\); \}/,
  `      const update: any = { mercadoPagoPaymentId: paymentId, paymentStatus: payment.status, paymentUpdatedAt: new Date().toISOString() };
      if (payment.status === 'approved') {
        update.status = 'PAID';
        update.paidAt = transactionData.paidAt || new Date().toISOString();
      }`,
  'idempotent paid timestamp'
);

replaceOnce(
  /const transaction = \{\n          id: transactionRef\.id,/,
  `const transaction = {
          id: transactionRef.id,`,
  'transaction declaration guard'
);

fs.writeFileSync(path, server);
console.log('Payment hardening patches applied successfully.');

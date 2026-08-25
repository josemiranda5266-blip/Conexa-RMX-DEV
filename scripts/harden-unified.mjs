import fs from 'node:fs';

const path = 'server.ts';
let server = fs.readFileSync(path, 'utf8');
const marker = '  // Global Error Handler Middleware';
if (!server.includes(marker)) throw new Error('Global error handler marker not found');

const reviewEndpoint = `  // Unified verified-review authority endpoint\n  app.post('/api/reviews/create', rateLimiter, async (req: Request, res: Response) => {\n    try {\n      const auth = await verifyAuthToken(req);\n      if (!auth.isAuthenticated || !auth.userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });\n      const body = req.body || {};\n      const quoteId = typeof body.quoteId === 'string' ? body.quoteId : '';\n      const ratingKeys = ['overallRating', 'qualityRating', 'punctualityRating', 'treatmentRating', 'priceRating', 'complianceRating'];\n      if (!quoteId || ratingKeys.some(k => !Number.isInteger(Number(body[k])) || Number(body[k]) < 1 || Number(body[k]) > 5)) return res.status(422).json({ success: false, error: 'INVALID_REVIEW' });\n      const db = await getAdminDb();\n      const txSnap = await db.collection('transactions').where('quoteId', '==', quoteId).where('clientId', '==', auth.userId).limit(1).get();\n      if (txSnap.empty) return res.status(403).json({ success: false, error: 'VERIFIED_JOB_REQUIRED' });\n      const txDoc = txSnap.docs[0];\n      const transaction = txDoc.data() || {};\n      if (transaction.status !== 'SERVICE_COMPLETED') return res.status(409).json({ success: false, error: 'SERVICE_NOT_COMPLETED' });\n      const existing = await db.collection('reviews').where('jobId', '==', txDoc.id).limit(1).get();\n      if (!existing.empty) return res.status(409).json({ success: false, error: 'REVIEW_ALREADY_EXISTS' });\n      const professionalRef = db.collection('users').doc(String(transaction.professionalId));\n      const professionalSnap = await professionalRef.get();\n      if (!professionalSnap.exists) return res.status(404).json({ success: false, error: 'PROFESSIONAL_NOT_FOUND' });\n      const professional = professionalSnap.data() || {};\n      const reviewId = \`review-\${txDoc.id}\`;\n      const reviewRef = db.collection('reviews').doc(reviewId);\n      const review = { id: reviewId, jobId: txDoc.id, clientId: auth.userId, clientName: String(body.clientName || '').slice(0, 160), clientAvatar: String(body.clientAvatar || '').slice(0, 1000), professionalId: String(transaction.professionalId), createdAt: new Date().toISOString(), comment: String(body.comment || '').slice(0, 4000), overallRating: Number(body.overallRating), qualityRating: Number(body.qualityRating), punctualityRating: Number(body.punctualityRating), treatmentRating: Number(body.treatmentRating), priceRating: Number(body.priceRating), complianceRating: Number(body.complianceRating), isVerifiedJob: true };\n      const newCount = Number(professional.reviewCount || 0) + 1;\n      const newRating = Number((((Number(professional.rating || 0) * Number(professional.reviewCount || 0)) + review.overallRating) / newCount).toFixed(1));\n      const requestRef = db.collection('service_requests').doc(String(transaction.serviceRequestId));\n      const batch = db.batch();\n      batch.create(reviewRef, review);\n      batch.update(professionalRef, { reviewCount: newCount, rating: newRating, jobsCompleted: Number(professional.jobsCompleted || 0) + 1 });\n      batch.update(txDoc.ref, { reviewSubmittedAt: new Date().toISOString() });\n      batch.update(requestRef, { status: 'CLOSED' });\n      await batch.commit();\n      return res.status(201).json({ success: true, review, professional: { id: professionalRef.id, rating: newRating, reviewCount: newCount, jobsCompleted: Number(professional.jobsCompleted || 0) + 1 } });\n    } catch (err) {\n      console.error('[CONEXA REVIEW]', err);\n      return res.status(500).json({ success: false, error: 'REVIEW_CREATE_ERROR' });\n    }\n  });\n\n`;
const verificationEndpoint = `  // Unified verification-request authority endpoint\n  app.post('/api/verifications/create', rateLimiter, async (req: Request, res: Response) => {\n    try {\n      const auth = await verifyAuthToken(req);\n      if (!auth.isAuthenticated || !auth.userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });\n      const body = req.body || {};\n      if (!['IDENTITY', 'PROFESSIONAL'].includes(body.type)) return res.status(422).json({ success: false, error: 'INVALID_VERIFICATION_TYPE' });\n      const documentName = String(body.documentName || '').trim();\n      const documentUrl = String(body.docUrl || '').trim();\n      if (!documentName || documentName.length > 300 || !documentUrl || documentUrl.length > 2000) return res.status(422).json({ success: false, error: 'INVALID_VERIFICATION_DOCUMENT' });\n      const db = await getAdminDb();\n      const userSnap = await db.collection('users').doc(auth.userId).get();\n      const user = userSnap.exists ? (userSnap.data() || {}) : {};\n      const id = \`ver-\${Date.now()}-\${crypto.randomBytes(5).toString('hex')}\`;\n      const verification = { id, userId: auth.userId, userName: String(user.name || '').slice(0, 160), userRole: auth.role, type: body.type, documentName, documentUrl, status: 'PENDING', createdAt: new Date().toISOString() };\n      await db.collection('verifications').doc(id).set(verification);\n      return res.status(201).json({ success: true, verification });\n    } catch (err) {\n      console.error('[CONEXA VERIFICATION]', err);\n      return res.status(500).json({ success: false, error: 'VERIFICATION_CREATE_ERROR' });\n    }\n  });\n\n`;

if (!server.includes("app.post('/api/reviews/create'")) server = server.replace(marker, reviewEndpoint + marker);
if (!server.includes("app.post('/api/verifications/create'")) server = server.replace(marker, verificationEndpoint + marker);

const checkoutGuard = /      if \(transaction\.status !== 'PAYMENT_PENDING'\) return res\.status\(409\)\.json\(\{ error: 'TRANSACTION_NOT_PAYABLE' \}\);/;
if (checkoutGuard.test(server)) server = server.replace(checkoutGuard, `      if (!['PAYMENT_PENDING', 'CHECKOUT_CREATED'].includes(String(transaction.status))) return res.status(409).json({ error: 'TRANSACTION_NOT_PAYABLE' });\n      if (transaction.mercadoPagoPreferenceId && transaction.mercadoPagoInitPoint) return res.json({ success: true, transactionId: transaction.id, preferenceId: transaction.mercadoPagoPreferenceId, initPoint: transaction.mercadoPagoInitPoint, sandboxInitPoint: transaction.mercadoPagoSandboxInitPoint || null });`);
server = server.replace(/await txRef\.update\(\{ mercadoPagoPreferenceId: preference\.id, status: 'PAYMENT_PENDING', paymentCheckoutCreatedAt: new Date\(\)\.toISOString\(\) \}\);/, "await txRef.update({ mercadoPagoPreferenceId: preference.id, mercadoPagoInitPoint: preference.init_point || null, mercadoPagoSandboxInitPoint: preference.sandbox_init_point || null, status: 'CHECKOUT_CREATED', paymentCheckoutCreatedAt: new Date().toISOString() });");

// Harden the authoritative quote-acceptance transition. This replacement is deliberately bounded
// between the transaction endpoint and the next account endpoint so it cannot alter unrelated routes.
const transactionEndpointPattern = /  app\.post\("\/api\/transactions\/create"[\s\S]*?\n  \}\);\n\n  \/\/ Account Deletion API Endpoint/;
if (transactionEndpointPattern.test(server)) {
  const hardenedTransactionEndpoint = `  app.post("/api/transactions/create", rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated || !auth.userId) return res.status(401).json({ success: false, error: "UNAUTHORIZED", code: "UNAUTHORIZED" });
      const { quoteId } = req.body || {};
      if (!quoteId || typeof quoteId !== 'string') return res.status(400).json({ success: false, error: "INVALID_QUOTE_ID", code: "INVALID_QUOTE_ID" });

      const firestore = await getAdminDb();
      const quoteRef = firestore.collection('quotes').doc(quoteId);
      const transactionRef = firestore.collection('transactions').doc(\`txn-\${quoteId}\`);
      const now = new Date().toISOString();
      const feePercentRaw = Number(process.env.CONEXA_PLATFORM_FEE_PERCENT || '8');
      const feePercent = Number.isFinite(feePercentRaw) && feePercentRaw >= 0 && feePercentRaw <= 20 ? feePercentRaw : 8;

      const result = await firestore.runTransaction(async (tx: any) => {
        const quoteSnap = await tx.get(quoteRef);
        if (!quoteSnap.exists) throw new Error('QUOTE_NOT_FOUND');
        const quote = quoteSnap.data() || {};
        if (typeof quote.priceArs !== 'number' || quote.priceArs <= 0) throw new Error('INVALID_QUOTE_AMOUNT');

        const requestRef = firestore.collection('service_requests').doc(String(quote.requestId));
        const requestSnap = await tx.get(requestRef);
        if (!requestSnap.exists) throw new Error('REQUEST_NOT_FOUND');
        const serviceRequest = requestSnap.data() || {};

        if (serviceRequest.clientId !== auth.userId) throw new Error('FORBIDDEN_REQUEST_OWNER');
        if (!['REQUEST_CREATED', 'QUOTES_RECEIVED'].includes(String(serviceRequest.status))) throw new Error('REQUEST_NOT_CONTRACTABLE');
        if (quote.status !== 'PENDING') throw new Error('QUOTE_NOT_AVAILABLE');
        if (serviceRequest.assignedProfessionalId && serviceRequest.assignedProfessionalId !== quote.professionalId) throw new Error('PROFESSIONAL_CONTEXT_MISMATCH');

        const clientRef = firestore.collection('users').doc(auth.userId);
        const clientSnap = await tx.get(clientRef);
        if (!clientSnap.exists || !['USER'].includes(String(clientSnap.data()?.role || auth.role))) throw new Error('CLIENT_ROLE_REQUIRED');

        const professionalRef = firestore.collection('users').doc(String(quote.professionalId));
        const professionalSnap = await tx.get(professionalRef);
        if (!professionalSnap.exists || professionalSnap.data()?.role !== 'PROFESSIONAL') throw new Error('PROFESSIONAL_ROLE_REQUIRED');

        const connectionRef = firestore.collection('mercadopago_connections').doc(String(quote.professionalId));
        const connectionSnap = await tx.get(connectionRef);
        if (!connectionSnap.exists || connectionSnap.data()?.connected !== true || !connectionSnap.data()?.accessTokenEnc) throw new Error('PROFESSIONAL_MERCADO_PAGO_NOT_CONNECTED');

        const existing = await tx.get(transactionRef);
        if (existing.exists) {
          const existingData = existing.data() || {};
          if (existingData.clientId !== auth.userId || existingData.quoteId !== quoteId || existingData.serviceRequestId !== quote.requestId) throw new Error('TRANSACTION_CONTEXT_MISMATCH');
          return existingData;
        }

        const amountArs = Number(quote.priceArs);
        const platformFeeArs = Number((amountArs * feePercent / 100).toFixed(2));
        const professionalAmountArs = Number((amountArs - platformFeeArs).toFixed(2));
        const transaction = {
          id: transactionRef.id,
          serviceRequestId: quote.requestId,
          quoteId,
          clientId: serviceRequest.clientId,
          professionalId: quote.professionalId,
          amountArs,
          currency: 'ARS',
          platformFeePercent: feePercent,
          platformFeeArs,
          professionalAmountArs,
          status: 'PAYMENT_PENDING',
          createdAt: now
        };

        tx.set(transactionRef, transaction);
        tx.update(quoteRef, { status: 'ACCEPTED' });
        tx.update(requestRef, { status: 'PROFESSIONAL_SELECTED', assignedProfessionalId: quote.professionalId });
        return transaction;
      });

      return res.status(201).json({ success: true, transaction: result });
    } catch (err: any) {
      const code = err?.message || 'TRANSACTION_CREATE_ERROR';
      const map: Record<string, number> = {
        QUOTE_NOT_FOUND: 404,
        REQUEST_NOT_FOUND: 404,
        FORBIDDEN_REQUEST_OWNER: 403,
        CLIENT_ROLE_REQUIRED: 403,
        PROFESSIONAL_ROLE_REQUIRED: 403,
        QUOTE_NOT_AVAILABLE: 409,
        REQUEST_NOT_CONTRACTABLE: 409,
        PROFESSIONAL_CONTEXT_MISMATCH: 409,
        PROFESSIONAL_MERCADO_PAGO_NOT_CONNECTED: 409,
        TRANSACTION_CONTEXT_MISMATCH: 409,
        INVALID_QUOTE_AMOUNT: 422
      };
      return res.status(map[code] || 500).json({ success: false, error: code, code });
    }
  });

  // Account Deletion API Endpoint`;
  server = server.replace(transactionEndpointPattern, hardenedTransactionEndpoint);
}

fs.writeFileSync(path, server);
console.log('Unified server hardening applied.');

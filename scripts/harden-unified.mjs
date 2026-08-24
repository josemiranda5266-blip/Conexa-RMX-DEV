import fs from 'node:fs';

function replaceOnce(text, regex, replacement, label) {
  if (!regex.test(text)) throw new Error(`Pattern not found: ${label}`);
  return text.replace(regex, replacement);
}

const ctxPath = 'src/context/AppContext.tsx';
let ctx = fs.readFileSync(ctxPath, 'utf8');

ctx = replaceOnce(ctx, /switchActiveMode: \(mode: 'CLIENT' \| 'PROFESSIONAL' \| 'ADMIN'\) => boolean;/, "switchActiveMode: (mode: 'CLIENT' | 'PROFESSIONAL') => boolean;", 'activeMode contract');
ctx = replaceOnce(ctx, /activeMode: claimRole === 'PROFESSIONAL' \? 'PROFESSIONAL' : claimRole === 'ADMIN' \? 'ADMIN' : 'CLIENT',/, "activeMode: claimRole === 'PROFESSIONAL' ? 'PROFESSIONAL' : 'CLIENT',", 'default activeMode');
ctx = replaceOnce(ctx, /rating: claimRole === 'PROFESSIONAL' \? 5\.0 : 0,/, 'rating: 0,', 'new professional rating');

ctx = replaceOnce(ctx, /            \/\/ Core Auth Synch Rules:[\s\S]*?            const finalIsProfessional = profileData\.isProfessional === true \|\|[\s\S]*?            const finalHasProfessionalProfile = profileData\.hasProfessionalProfile === true \|\|[\s\S]*?            const finalActiveMode = profileData\.activeMode \|\|[\s\S]*?\n\n/, `            // Authorization is derived from Firebase Custom Claims only. Firestore stores profile data, not privileges.
            const effectiveRole: Role = claimRole;
            const finalIsProfessional = effectiveRole === 'PROFESSIONAL';
            const finalHasProfessionalProfile = effectiveRole === 'PROFESSIONAL';
            const finalActiveMode: 'CLIENT' | 'PROFESSIONAL' =
              effectiveRole === 'PROFESSIONAL' && profileData.activeMode === 'PROFESSIONAL'
                ? 'PROFESSIONAL'
                : 'CLIENT';

`, 'authoritative role resolution');

ctx = replaceOnce(ctx, /  const switchActiveMode = \(mode: 'CLIENT' \| 'PROFESSIONAL' \| 'ADMIN'\): boolean => \{[\s\S]*?\n  \};\n\n  const toggleFavorite/, `  const switchActiveMode = (mode: 'CLIENT' | 'PROFESSIONAL'): boolean => {
    if (!currentUser) return false;
    if (mode === 'PROFESSIONAL' && currentUser.role !== 'PROFESSIONAL') {
      console.warn('[CONEXA SECURITY] Intento no autorizado de activar modo profesional.');
      return false;
    }

    const updated = { ...currentUser, activeMode: mode };
    setCurrentUser(updated);
    setUsers(uList => uList.map(u => u.id === currentUser.id ? updated : u));

    if (isFirebaseConfigured && db) {
      const userDocRef = doc(db, 'users', currentUser.id);
      updateDoc(userDocRef, { activeMode: mode }).catch(err => {
        console.warn('[CONEXA AUTH] Error saving activeMode to Firestore:', err);
      });
    }
    return true;
  };

  const toggleFavorite`, 'secure activeMode');

ctx = replaceOnce(ctx, /  const addReview = async \(reviewData:[\s\S]*?\n  \};\n\n  const submitVerification/, `  const addReview = async (reviewData: Omit<Review, 'id' | 'createdAt' | 'isVerifiedJob'>) => {
    if (!auth?.currentUser || !currentUser) throw new Error('Debés iniciar sesión para dejar una reseña.');
    const token = await auth.currentUser.getIdToken();
    const response = await fetch('/api/reviews/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
      body: JSON.stringify(reviewData)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !data.review) throw new Error(data.error || 'No se pudo guardar la reseña.');
    const savedReview = data.review as Review;
    setReviews(prev => [savedReview, ...prev.filter(r => r.id !== savedReview.id)]);
    if (data.professional) {
      const professional = data.professional as UserProfile;
      setUsers(prev => prev.map(u => u.id === professional.id ? { ...u, ...professional } : u));
    }
    return savedReview;
  };

  const submitVerification`, 'server-authoritative reviews');

ctx = replaceOnce(ctx, /  const submitVerification = \(type: 'IDENTITY' \| 'PROFESSIONAL', documentName: string, docUrl: string\) => \{[\s\S]*?\n  \};\n\n  \/\/ Helper for Admin Audit Logging/, `  const submitVerification = async (type: 'IDENTITY' | 'PROFESSIONAL', documentName: string, docUrl: string) => {
    if (!auth?.currentUser || !currentUser) throw new Error('Debés iniciar sesión para solicitar una verificación.');
    const token = await auth.currentUser.getIdToken();
    const response = await fetch('/api/verifications/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
      body: JSON.stringify({ type, documentName, docUrl })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !data.verification) throw new Error(data.error || 'No se pudo enviar la verificación.');
    const savedVerification = data.verification as VerificationRequest;
    setVerifications(prev => [savedVerification, ...prev.filter(v => v.id !== savedVerification.id)]);
    return savedVerification;
  };

  // Helper for Admin Audit Logging`, 'server-authoritative verification');

fs.writeFileSync(ctxPath, ctx);

const serverPath = 'server.ts';
let server = fs.readFileSync(serverPath, 'utf8');

// Existing unified endpoint: authorization must come from the verified claim, never mutable profile fields.
server = replaceOnce(
  server,
  /const effectiveProfessional = auth\.role === 'PROFESSIONAL' \|\| user\.role === 'PROFESSIONAL' \|\| user\.isProfessional === true;\n      if \(!effectiveProfessional\)/,
  "if (auth.role !== 'PROFESSIONAL')",
  'quote professional authorization'
);
server = replaceOnce(
  server,
  /requestId: body\.requestId, professionalId: auth\.userId,/,
  'requestId: body.requestId, clientId: request.clientId, professionalId: auth.userId,',
  'server-derived quote clientId'
);

// The endpoint may already exist from an earlier consolidation. Only add it when absent.
const marker = '  // Global Error Handler Middleware';
if (!server.includes(marker)) throw new Error('Server insertion marker not found');
if (!server.includes("app.post('/api/quotes/submit'")) {
  const endpoints = `  // ==========================================\n  // CONEXA QUOTE + JOB AUTHORITY ENDPOINTS\n  // ==========================================\n\n  app.post('/api/quotes/submit', rateLimiter, async (req: Request, res: Response) => {\n    try {\n      const auth = await verifyAuthToken(req);\n      if (!auth.isAuthenticated || !auth.userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });\n      const body = req.body || {};\n      if (!body.requestId || typeof body.requestId !== 'string') return res.status(400).json({ success: false, error: 'INVALID_REQUEST_ID' });\n      const priceArs = Number(body.priceArs);\n      if (!Number.isFinite(priceArs) || priceArs <= 0 || priceArs > 1000000000) return res.status(422).json({ success: false, error: 'INVALID_QUOTE_AMOUNT' });\n      if (typeof body.description !== 'string' || body.description.trim().length < 3 || body.description.length > 4000) return res.status(422).json({ success: false, error: 'INVALID_QUOTE_DESCRIPTION' });\n      if (auth.role !== 'PROFESSIONAL') return res.status(403).json({ success: false, error: 'PROFESSIONAL_ROLE_REQUIRED' });\n      const db = await getAdminDb();\n      const userSnap = await db.collection('users').doc(auth.userId).get();\n      const user = userSnap.exists ? (userSnap.data() || {}) : {};\n      const requestRef = db.collection('service_requests').doc(body.requestId);\n      const result = await db.runTransaction(async (tx: any) => {\n        const requestSnap = await tx.get(requestRef);\n        if (!requestSnap.exists) throw new Error('REQUEST_NOT_FOUND');\n        const request = requestSnap.data() || {};\n        if (['CANCELLED', 'COMPLETED', 'CLOSED'].includes(String(request.status))) throw new Error('REQUEST_NOT_AVAILABLE');\n        if (request.clientId === auth.userId) throw new Error('SELF_QUOTE_FORBIDDEN');\n        const quoteId = \`quote-\${Date.now()}-\${crypto.randomBytes(5).toString('hex')}\`;\n        const quoteRef = db.collection('quotes').doc(quoteId);\n        const quote = { id: quoteId, requestId: body.requestId, clientId: request.clientId, professionalId: auth.userId, professionalName: String(user.name || 'Profesional CONEXA').slice(0, 160), professionalAvatar: String(user.avatar || '').slice(0, 1000), professionalRating: Number(user.rating || 0), professionalVerified: user.isProfessionalVerified === true, priceArs, description: body.description.trim(), materialsIncluded: String(body.materialsIncluded || '').slice(0, 1000), estimatedTime: String(body.estimatedTime || '').slice(0, 500), availableStartDate: String(body.availableStartDate || '').slice(0, 100), warrantyInfo: String(body.warrantyInfo || '').slice(0, 1000), termsAndConditions: String(body.termsAndConditions || '').slice(0, 2000), status: 'PENDING', createdAt: new Date().toISOString() };\n        tx.set(quoteRef, quote);\n        tx.update(requestRef, { quotesCount: Number(request.quotesCount || 0) + 1, status: 'QUOTES_RECEIVED' });\n        return quote;\n      });\n      return res.status(201).json({ success: true, quote: result });\n    } catch (err: any) {\n      const code = err?.message || 'QUOTE_SUBMIT_ERROR';\n      const statuses: Record<string, number> = { REQUEST_NOT_FOUND: 404, REQUEST_NOT_AVAILABLE: 409, SELF_QUOTE_FORBIDDEN: 403 };\n      return res.status(statuses[code] || 500).json({ success: false, error: code });\n    }\n  });\n\n  app.post('/api/jobs/complete', rateLimiter, async (req: Request, res: Response) => {\n    try {\n      const auth = await verifyAuthToken(req);\n      if (!auth.isAuthenticated || !auth.userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });\n      const requestId = req.body?.requestId;\n      if (!requestId || typeof requestId !== 'string') return res.status(400).json({ success: false, error: 'INVALID_REQUEST_ID' });\n      if (auth.role !== 'PROFESSIONAL') return res.status(403).json({ success: false, error: 'PROFESSIONAL_ROLE_REQUIRED' });\n      const db = await getAdminDb();\n      const requestRef = db.collection('service_requests').doc(requestId);\n      const result = await db.runTransaction(async (tx: any) => {\n        const requestSnap = await tx.get(requestRef);\n        if (!requestSnap.exists) throw new Error('REQUEST_NOT_FOUND');\n        const request = requestSnap.data() || {};\n        if (request.clientId === auth.userId) throw new Error('CLIENT_CANNOT_COMPLETE_JOB');\n        const txQuery = db.collection('transactions').where('serviceRequestId', '==', requestId).where('professionalId', '==', auth.userId).limit(1);\n        const txSnap = await tx.get(txQuery);\n        if (txSnap.empty) throw new Error('ASSIGNED_PROFESSIONAL_REQUIRED');\n        const transactionDoc = txSnap.docs[0];\n        if (!['PROFESSIONAL_SELECTED', 'IN_PROGRESS', 'REVIEW_PENDING'].includes(String(request.status))) throw new Error('INVALID_JOB_STATE');\n        if (request.status !== 'REVIEW_PENDING') tx.update(requestRef, { status: 'REVIEW_PENDING' });\n        const transaction = transactionDoc.data() || {};\n        const completedAt = transaction.completedAt || new Date().toISOString();\n        if (transaction.status !== 'SERVICE_COMPLETED') tx.update(transactionDoc.ref, { status: 'SERVICE_COMPLETED', completedAt });\n        return { ...transaction, id: transactionDoc.id, status: 'SERVICE_COMPLETED', completedAt };\n      });\n      return res.json({ success: true, requestId, status: 'REVIEW_PENDING', transaction: result });\n    } catch (err: any) {\n      const code = err?.message || 'JOB_COMPLETE_ERROR';\n      const statuses: Record<string, number> = { REQUEST_NOT_FOUND: 404, CLIENT_CANNOT_COMPLETE_JOB: 403, ASSIGNED_PROFESSIONAL_REQUIRED: 403, INVALID_JOB_STATE: 409 };\n      return res.status(statuses[code] || 500).json({ success: false, error: code });\n    }\n  });\n\n`;
  server = server.replace(marker, endpoints + marker);
}

fs.writeFileSync(serverPath, server);
console.log('Unified hardening patches applied successfully.');

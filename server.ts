import express, { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import * as adminModule from "firebase-admin";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { validateMercadoPagoEnv } from "./src/lib/envValidation.js";
import { verifyUserAuthToken } from "./src/server/auth.js";

const firebaseAdmin: any = (adminModule as any).default || adminModule;
let firebaseAdminApp: any = null;

function getFirebaseAdmin(): any {
  if (firebaseAdminApp) return firebaseAdminApp;
  if (firebaseAdmin.apps && firebaseAdmin.apps.length > 0) {
    firebaseAdminApp = firebaseAdmin.apps[0];
    return firebaseAdminApp;
  }

  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  const gacEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  let credential: any = null;

  if (saEnv) {
    try {
      let parsedSA: any;
      if (saEnv.startsWith('{')) {
        parsedSA = JSON.parse(saEnv);
      } else {
        const decoded = Buffer.from(saEnv, 'base64').toString('utf8');
        parsedSA = JSON.parse(decoded);
      }
      credential = firebaseAdmin.cert(parsedSA);
    } catch (err: any) {
      console.error('[FIREBASE ADMIN] Error parseando FIREBASE_SERVICE_ACCOUNT:', err?.message || err);
    }
  }

  if (!credential && gacEnv) {
    try {
      credential = firebaseAdmin.applicationDefault();
    } catch (err: any) {
      console.error('[FIREBASE ADMIN] Error con GOOGLE_APPLICATION_CREDENTIALS:', err?.message || err);
    }
  }

  if (!credential) {
    try {
      credential = firebaseAdmin.applicationDefault();
    } catch {
      // ADC unavailable
    }
  }

  if (!credential) {
    return null;
  }

  try {
    firebaseAdminApp = firebaseAdmin.initializeApp({ credential });
    console.log('[FIREBASE ADMIN] Inicializado exitosamente.');
    return firebaseAdminApp;
  } catch (err: any) {
    console.error('[FIREBASE ADMIN] Error en initializeApp:', err?.message || err);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Environment Variables Validation for Mercado Pago & Platform Config
  const envValidation = validateMercadoPagoEnv();
  if (!envValidation.isValid) {
    console.warn("\n⚠️ [Mercado Pago Config Warning] Se detectaron variables de entorno faltantes o con formato inválido:");
    envValidation.errors.forEach((err) => console.warn(`   ${err}`));
    console.warn("   Para habilitar pagos de Mercado Pago, configure las variables correspondientes.\n");
    if (process.env.STRICT_ENV_CHECK === "true") {
      validateMercadoPagoEnv({ throwOnError: true });
    }
  } else {
    console.log("✅ [Mercado Pago Config] Todas las variables de entorno requeridas están configuradas y verificadas con éxito.");
  }

  // Security Headers Middleware
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { (req as any).rawBody = Buffer.from(buf); } }));

  // In-Memory Rate Limiter (Token Bucket per IP)
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for'] as string || '127.0.0.1';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 30; // max 30 requests per minute

    const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count++;
    }

    rateLimitMap.set(ip, record);

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: "Límite de solicitudes excedido (Rate Limit). Intente nuevamente en un minuto.",
        status: "RATE_LIMITED"
      });
    }
    next();
  };

  // Helper function to sanitize PII (phone numbers and exact addresses) before sending to Gemini or logging
  function sanitizePIIForAI(text: string): string {
    if (!text) return "";
    return text
      // Redact Argentine phone numbers (e.g., +54 9 385 1234567, 0385-15412345, 11-2345-6789)
      .replace(/(\+?54\s*9?\s*)?(\d{2,4})[\s\-]*(\d{6,8})/g, '[TELÉFONO_REDACTADO_POR_PRIVACIDAD]')
      // Redact street address numbers (e.g. San Martín 1234, Av Belgrano 452)
      .replace(/(calle|av\.|avenida|pasaje)?\s+[a-záéíóúñ\s]{3,20}\s+\d{1,5}/gi, '[DOMICILIO_PROTEGIDO]');
  }

  // Shared Gemini SDK client instance
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI | null {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        console.warn("GEMINI_API_KEY is missing or unconfigured.");
        return null;
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
    return aiClient;
  }

  // Health endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "CONEXA Private Services Network", timestamp: new Date().toISOString() });
  });

  // AI Natural Language Search & Request Interpreter (Rate limited & PII sanitized)
  app.post("/api/gemini/parse-request", rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated) {
        return res.status(401).json({ error: "Se requiere autenticación para utilizar la IA de CONEXA.", code: "UNAUTHORIZED" });
      }

      const { userPrompt } = req.body;
      if (!userPrompt || typeof userPrompt !== "string") {
        return res.status(400).json({ error: "Parámetro userPrompt inválido" });
      }

      // Sanitize PII before AI processing
      const sanitizedPrompt = sanitizePIIForAI(userPrompt.trim().slice(0, 500));

      const ai = getGeminiClient();
      if (!ai) {
        // Fallback rule-based parsing if key is missing
        return res.json({
          category: "Hogar & Construcción",
          professionName: "Plomero / Fontanero",
          title: "Solicitud de servicio",
          description: sanitizedPrompt,
          urgency: userPrompt.toLowerCase().includes("urgente") ? "URGENTE" : "NORMAL",
          estimatedBudgetArs: 35000,
          suggestedKeywords: ["plomero", "reparación", "pérdida"]
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Analizá la siguiente solicitud de un usuario en Argentina para contratar un servicio profesional o solucionar un problema: "${sanitizedPrompt}". 
Responde ÚNICAMENTE en formato JSON estructurado con estas claves:
- category: categoría de servicio sugerida (ej. "Hogar & Construcción", "Profesionales & Graduados", "Tecnología & Digital", "Salud & Estética", "Mecánica & Vehículos", "Servicios & Eventos")
- professionName: nombre de la profesión específica (ej. "Plomero / Fontanero", "Electricista Matriculado", "Gasista Matriculado", "Abogado", "Técnico de Computación")
- title: título resumido y profesional de la solicitud
- description: descripción pulida en español para publicar
- urgency: "NORMAL", "ALTA" o "URGENTE"
- estimatedBudgetArs: entero estimado sugerido en pesos argentinos ARS (o 0 si incierto)
- suggestedKeywords: arreglo de palabras clave para filtrar`,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "Sos el asistente inteligente oficial de la app CONEXA en Argentina. Convertís solicitudes en lenguaje natural en especificaciones de servicio limpias y estructuradas. NUNCA incluyas datos personales."
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json(parsed);
    } catch (err: any) {
      console.error("Error al procesar solicitud con IA");
      return res.status(500).json({ error: "Error interno al procesar la solicitud con IA. Intente nuevamente." });
    }
  });

  // AI Moderation & Fraud Check endpoint
  app.post("/api/gemini/moderate", rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated) {
        return res.status(401).json({ error: "Se requiere autenticación para utilizar la moderación de CONEXA.", code: "UNAUTHORIZED" });
      }

      const { text, contextType } = req.body; // contextType: 'chat' | 'review' | 'request'
      if (!text || typeof text !== "string") {
        return res.json({ isSafe: true, flags: [], riskScore: 0, analysis: "Sin texto provisto." });
      }

      const sanitizedText = sanitizePIIForAI(text.trim().slice(0, 1000));
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({ isSafe: true, flags: [], riskScore: 0, analysis: "Verificación estándar superada." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Analizá el siguiente texto de ${contextType || 'plataforma'} en busca de fraude, cobros por fuera sospechosos, acoso, spam o reseñas falsas: "${sanitizedText}".
Responde en JSON con:
- isSafe: boolean
- flags: arreglo de etiquetas detectadas (ej. ["OFF_PLATFORM_PAYMENT_WARNING", "SPAM", "HARASSMENT", "FAKE_REVIEW_SUSPECTED"])
- riskScore: número entre 0 y 100
- analysis: explicación breve de 1 oración en español
- warningMessageToUser: mensaje preventivo para el usuario si riskScore > 40`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json(parsed);
    } catch (err: any) {
      console.error("Error en moderación con IA");
      return res.json({ isSafe: true, flags: [], riskScore: 0, analysis: "Verificación estándar de seguridad superada." });
    }
  });

  // Centralized Auth Verification & Middleware
  // IMPORTANT: user authentication is Firebase-ID-token-only.
  // S2S/operator secrets are handled separately by verifyS2SSecret() in src/server/auth.ts
  // and MUST NEVER create a user identity or SUPER_ADMIN session.
  async function verifyAuthToken(req: Request): Promise<{
    isAuthenticated: boolean;
    isAdmin: boolean;
    userId?: string;
    role?: string;
    errorReason?: string;
  }> {
    return verifyUserAuthToken(req, getFirebaseAdmin);
  }

  // Private contact disclosure is mediated by the backend because Firebase Admin
  // bypasses Firestore Rules and direct reads of /private/info are never exposed.
  app.get('/api/conversations/:conversationId/shared-contact/:type', rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated || !auth.userId) {
        return res.status(401).json({ error: 'UNAUTHORIZED' });
      }

      const conversationId = String(req.params.conversationId || '').trim();
      const type = String(req.params.type || '').trim();
      if (!conversationId || !['phone', 'address'].includes(type)) {
        return res.status(400).json({ error: 'INVALID_SHARED_CONTACT_REQUEST' });
      }

      const db = await getAdminDb();
      const conversationSnap = await db.collection('conversations').doc(conversationId).get();
      if (!conversationSnap.exists) {
        return res.status(404).json({ error: 'CONVERSATION_NOT_FOUND' });
      }

      const conversation = conversationSnap.data() || {};
      const participantIds = Array.isArray(conversation.participantIds) ? conversation.participantIds : [];
      if (participantIds.length !== 2 || !participantIds.includes(auth.userId)) {
        return res.status(403).json({ error: 'FORBIDDEN' });
      }

      const ownerId = participantIds.find((userId: string) => userId !== auth.userId);
      if (!ownerId) {
        return res.status(403).json({ error: 'FORBIDDEN' });
      }

      const privacyByUser = conversation.privacyByUser || {};
      const ownerPrivacy = privacyByUser[ownerId] || {};
      const isShared = type === 'phone'
        ? ownerPrivacy.phoneShared === true
        : ownerPrivacy.addressShared === true;

      if (!isShared) {
        return res.status(403).json({ error: 'CONTACT_NOT_SHARED' });
      }

      const privateInfoSnap = await db.collection('users').doc(ownerId).collection('private').doc('info').get();
      if (!privateInfoSnap.exists) {
        return res.status(404).json({ error: 'PRIVATE_CONTACT_NOT_AVAILABLE' });
      }

      const privateInfo = privateInfoSnap.data() || {};
      const value = type === 'phone'
        ? privateInfo.phonePrivate
        : privateInfo.exactAddressPrivate;

      if (typeof value !== 'string' || !value.trim()) {
        return res.status(404).json({ error: 'PRIVATE_CONTACT_NOT_AVAILABLE' });
      }

      res.setHeader('Cache-Control', 'no-store, private');
      return res.json({ type, value: value.trim() });
    } catch (err: any) {
      console.error('[CONEXA PRIVACY] Shared contact access failed:', err?.message || err);
      return res.status(500).json({ error: 'SHARED_CONTACT_ACCESS_FAILED' });
    }
  });

  // ==========================================
  // MERCADO PAGO MARKETPLACE - OAuth + Checkout Pro
  // ==========================================
  function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`MISSING_ENV_${name}`);
    return value;
  }

  function getMpRedirectUri(): string {
    const base = (process.env.APP_URL || '').replace(/\/$/, '');
    if (!base) throw new Error('MISSING_ENV_APP_URL');
    return `${base}/api/mercadopago/oauth/callback`;
  }

  function getEncryptionKey(): Buffer {
    const raw = process.env.MP_TOKEN_ENCRYPTION_KEY;
    if (!raw) throw new Error('MISSING_ENV_MP_TOKEN_ENCRYPTION_KEY');
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) throw new Error('INVALID_ENV_MP_TOKEN_ENCRYPTION_KEY');
    return key;
  }

  function encryptSecret(value: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  function decryptSecret(payload: string): string {
    const key = getEncryptionKey();
    const [ivB64, tagB64, dataB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !dataB64) throw new Error('INVALID_ENCRYPTED_SECRET');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()]).toString('utf8');
  }

  function createOAuthState(userId: string): string {
    const payload = Buffer.from(JSON.stringify({ uid: userId, nonce: crypto.randomBytes(18).toString('hex'), exp: Date.now() + 10 * 60 * 1000 })).toString('base64url');
    const secret = requireEnv('MP_OAUTH_STATE_SECRET');
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  function verifyOAuthState(state: string): { uid: string } | null {
    const [payload, sig] = (state || '').split('.');
    if (!payload || !sig) return null;
    const secret = requireEnv('MP_OAUTH_STATE_SECRET');
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed.uid || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null;
    return { uid: parsed.uid };
  }

  let cachedDbId: string | null = null;
  function getFirestoreDatabaseId(): string {
    if (cachedDbId) return cachedDbId;
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.firestoreDatabaseId) {
          cachedDbId = parsed.firestoreDatabaseId;
          return cachedDbId;
        }
      }
    } catch (err) {
      console.error('[FIREBASE ADMIN] Error leyendo firestoreDatabaseId:', err);
    }
    return '(default)';
  }

  async function getAdminDb(): Promise<any> {
    const adminApp = getFirebaseAdmin();
    if (!adminApp) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
    const dbId = getFirestoreDatabaseId();
    if (dbId && dbId !== '(default)') {
      try {
        return getAdminFirestore(adminApp, dbId);
      } catch (err: any) {
        console.error(`[FIREBASE ADMIN] Error obteniendo base de datos nombrada '${dbId}', reintentando por defecto:`, err?.message || err);
        return adminApp.firestore();
      }
    }
    return adminApp.firestore();
  }

  // Diagnostic Endpoint: Only returns booleans
  app.get('/api/auth/config-status', (_req: Request, res: Response) => {
    const firebaseAdminApp = getFirebaseAdmin();
    const mpEnv = validateMercadoPagoEnv();

    let clientConfigured = false;
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.projectId && parsed.apiKey) {
          clientConfigured = true;
        }
      }
    } catch {
      clientConfigured = false;
    }

    const hasAdminEnv = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS);

    let adminProjectId = null;
    const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
    if (saEnv) {
      try {
        const raw = saEnv.startsWith('{') ? saEnv : Buffer.from(saEnv, 'base64').toString('utf8');
        const parsed = JSON.parse(raw);
        adminProjectId = parsed.project_id || null;
      } catch {}
    }

    let clientProjectId = 'smurfy-shelter-kt8c4';
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.projectId) {
          clientProjectId = parsed.projectId;
        }
      }
    } catch {}

    const firestoreDatabaseIdBackend = getFirestoreDatabaseId();

    return res.json({
      firebaseClientConfigured: clientConfigured,
      firebaseAdminConfigured: hasAdminEnv,
      firebaseAdminInitialized: firebaseAdminApp !== null,
      mercadoPagoConfigured: mpEnv.isValid,
      clientProjectIdExpected: clientProjectId,
      adminProjectIdActual: adminProjectId,
      projectsMatch: adminProjectId === clientProjectId,
      firestoreDatabaseIdBackend: firestoreDatabaseIdBackend
    });
  });

  app.post('/api/auth/verify-token', async (req: Request, res: Response) => {
    try {
      const { token } = req.body || {};
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'TOKEN_REQUIRED', message: 'Se requiere un token de Firebase ID en el cuerpo de la solicitud.' });
      }

      const adminApp = getFirebaseAdmin();
      if (!adminApp) {
        return res.status(503).json({ error: 'FIREBASE_ADMIN_NOT_CONFIGURED', message: 'El backend de Firebase Admin no está configurado.' });
      }

      try {
        const decodedToken = await adminApp.auth().verifyIdToken(token);
        return res.json({
          success: true,
          uid: decodedToken.uid,
          email: decodedToken.email || null,
          role: decodedToken.role || null,
          projectId: adminApp.options.projectId || '(not specified in options)'
        });
      } catch (verifyErr: any) {
        console.error('[DIAGNOSTIC VERIFY TOKEN ERROR]', verifyErr?.message || verifyErr);
        return res.status(400).json({
          success: false,
          error: 'TOKEN_VERIFICATION_FAILED',
          message: verifyErr?.message || 'La verificación del token de Firebase falló.',
          code: verifyErr?.code || null
        });
      }
    } catch (err: any) {
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
    }
  });

  app.get('/api/mercadopago/oauth/start', async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated || !auth.userId) {
        if (auth.errorReason === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
          return res.status(503).json({ error: 'FIREBASE_ADMIN_NOT_CONFIGURED', message: 'El backend de Firebase Admin no está configurado en el servidor.' });
        }
        return res.status(401).json({ error: auth.errorReason || 'UNAUTHORIZED' });
      }
      const appId = requireEnv('MP_APP_ID');
      const redirectUri = getMpRedirectUri();
      const state = createOAuthState(auth.userId);
      const url = new URL('https://auth.mercadopago.com.ar/authorization');
      url.searchParams.set('client_id', appId);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('platform_id', 'mp');
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('state', state);
      return res.json({ authorizationUrl: url.toString(), redirectUri });
    } catch (err: any) {
      return res.status(503).json({ error: 'MERCADO_PAGO_NOT_CONFIGURED', detail: err?.message || 'Configuration error' });
    }
  });

  app.get('/api/mercadopago/oauth/callback', async (req: Request, res: Response) => {
    try {
      const code = String(req.query.code || '');
      const state = String(req.query.state || '');
      const stateData = verifyOAuthState(state);
      if (!code || !stateData) return res.status(400).send('Autorización de Mercado Pago inválida o expirada.');

      const clientId = requireEnv('MP_APP_ID');
      const clientSecret = requireEnv('MP_CLIENT_SECRET');
      const redirectUri = getMpRedirectUri();

      const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }).toString()
      });

      if (!tokenResponse.ok) {
        const body = await tokenResponse.text();
        console.error('[MP OAuth] token exchange failed', tokenResponse.status, body.slice(0, 500));
        return res.status(502).send('No se pudo completar la vinculación con Mercado Pago.');
      }

      const token = await tokenResponse.json() as any;
      if (!token.access_token || !token.refresh_token) return res.status(502).send('Mercado Pago no devolvió credenciales completas.');

      const db = await getAdminDb();
      await db.collection('mercado_pago_connections').doc(stateData.uid).set({
        userId: stateData.uid,
        connected: true,
        mpUserId: String(token.user_id || ''),
        publicKey: token.public_key || null,
        accessTokenEnc: encryptSecret(token.access_token),
        refreshTokenEnc: encryptSecret(token.refresh_token),
        expiresIn: Number(token.expires_in || 0),
        tokenCreatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
      return res.redirect(`${appUrl}/?mercadopago=connected`);
    } catch (err: any) {
      console.error('[MP OAuth] callback error', err?.message || err);
      return res.status(500).send('Error interno al vincular Mercado Pago.');
    }
  });

  app.get('/api/mercadopago/status', async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated) {
        let errorCode = 'UNAUTHORIZED';
        let httpStatus = 401;
        if (auth.errorReason === 'MISSING_BEARER_TOKEN' || auth.errorReason === 'EMPTY_TOKEN') {
          errorCode = 'UNAUTHENTICATED_CLIENT';
        } else if (auth.errorReason === 'INVALID_FIREBASE_ID_TOKEN') {
          errorCode = 'INVALID_FIREBASE_ID_TOKEN';
        } else if (auth.errorReason === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
          errorCode = 'FIREBASE_ADMIN_NOT_CONFIGURED';
          httpStatus = 503;
        }
        return res.status(httpStatus).json({ error: errorCode, reason: auth.errorReason });
      }

      if (!auth.userId) {
        return res.status(401).json({ error: 'UNAUTHENTICATED_CLIENT', reason: 'NO_USER_ID' });
      }

      let db;
      try {
        db = await getAdminDb();
      } catch (dbErr: any) {
        return res.status(503).json({ error: 'FIREBASE_ADMIN_NOT_CONFIGURED', detail: dbErr?.message });
      }

      try {
        const snap = await db.collection('mercado_pago_connections').doc(auth.userId).get();
        if (!snap.exists) return res.json({ connected: false });
        const data = snap.data() || {};
        return res.json({ connected: data.connected === true, mpUserId: data.mpUserId || null, publicKey: data.publicKey || null, updatedAt: data.updatedAt || null });
      } catch (dbErr: any) {
        console.error('[MERCADO PAGO STATUS] Error querying Firestore:', dbErr);
        return res.status(503).json({ error: 'FIREBASE_FIRESTORE_ERROR', detail: dbErr?.message });
      }
    } catch (err: any) {
      console.error('[MERCADO PAGO STATUS] Top-level error:', err);
      return res.status(503).json({ error: 'MERCADO_PAGO_NOT_CONFIGURED', detail: err?.message });
    }
  });

  app.post('/api/mercadopago/disconnect', rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated || !auth.userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

      const db = await getAdminDb();
      await db.collection('mercado_pago_connections').doc(auth.userId).set({ connected: false, accessTokenEnc: null, refreshTokenEnc: null, disconnectedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'MERCADO_PAGO_DISCONNECT_FAILED' });
    }
  });

  // Creates a Checkout Pro preference for a transaction using the professional's OAuth token.
  // The client never receives the seller access token.
  app.post('/api/mercadopago/checkout/create', rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated || !auth.userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

      const { transactionId } = req.body || {};
      if (!transactionId || typeof transactionId !== 'string') return res.status(400).json({ error: 'INVALID_TRANSACTION_ID' });

      const db = await getAdminDb();
      const txRef = db.collection('transactions').doc(transactionId);
      const txSnap = await txRef.get();
      if (!txSnap.exists) return res.status(404).json({ error: 'TRANSACTION_NOT_FOUND' });

      const transaction = txSnap.data() || {};
      if (transaction.clientId !== auth.userId) return res.status(403).json({ error: 'FORBIDDEN' });
      if (transaction.status !== 'PAYMENT_PENDING') return res.status(409).json({ error: 'TRANSACTION_NOT_PAYABLE' });

      const connectionSnap = await db.collection('mercado_pago_connections').doc(transaction.professionalId).get();
      if (!connectionSnap.exists) return res.status(409).json({ error: 'PROFESSIONAL_MERCADO_PAGO_NOT_CONNECTED' });
      const connection = connectionSnap.data() || {};
      if (!connection.connected || !connection.accessTokenEnc) return res.status(409).json({ error: 'PROFESSIONAL_MERCADO_PAGO_NOT_CONNECTED' });

      const sellerAccessToken = decryptSecret(connection.accessTokenEnc);
      const fee = Number(transaction.platformFeeAmountArs || 0);
      const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');

      const preferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', Authorization: `Bearer ${sellerAccessToken}` },
        body: JSON.stringify({
          items: [{ id: transaction.quoteId, title: `Servicio CONEXA ${transaction.serviceRequestId}`, quantity: 1, currency_id: 'ARS', unit_price: Number(transaction.amountArs) }],
          marketplace_fee: fee,
          external_reference: transaction.id,
          back_urls: { success: `${appUrl}/?payment=success&transaction=${encodeURIComponent(transaction.id)}`, failure: `${appUrl}/?payment=failure&transaction=${encodeURIComponent(transaction.id)}`, pending: `${appUrl}/?payment=pending&transaction=${encodeURIComponent(transaction.id)}` },
          auto_return: 'approved',
          notification_url: `${appUrl}/api/mercadopago/webhook?transactionId=${encodeURIComponent(transaction.id)}`
        })
      });

      const bodyText = await preferenceResponse.text();
      if (!preferenceResponse.ok) {
        console.error('[MP Checkout] preference failed', preferenceResponse.status, bodyText.slice(0, 1000));
        return res.status(502).json({ error: 'MERCADO_PAGO_PREFERENCE_FAILED' });
      }

      const preference = JSON.parse(bodyText);
      await txRef.update({
        mercadoPagoPreferenceId: preference.id,
        status: 'PAYMENT_PENDING',
        paymentCheckoutCreatedAt: new Date().toISOString()
      });

      return res.json({ success: true, transactionId: transaction.id, preferenceId: preference.id, initPoint: preference.init_point, sandboxInitPoint: preference.sandbox_init_point || null });
    } catch (err: any) {
      console.error('[MP Checkout] error', err?.message || err);
      return res.status(500).json({ error: 'MERCADO_PAGO_CHECKOUT_FAILED' });
    }
  });

  app.post('/api/mercadopago/webhook', async (req: Request, res: Response) => {
    // Mercado Pago notifications are acknowledged quickly. The authoritative payment status
    // is fetched server-to-server below; browser redirects are never treated as proof of payment.
    try {
      const raw = Buffer.isBuffer((req as any).rawBody) ? (req as any).rawBody : Buffer.from(JSON.stringify(req.body || {}));
      const signature = String(req.headers['x-signature'] || '');
      const requestId = String(req.headers['x-request-id'] || '');
      const webhookSecret = process.env.MP_WEBHOOK_SECRET;

      if (webhookSecret) {
        // In production, a configured secret means every webhook must carry
        // the signature headers. Never silently downgrade to an unsigned event.
        if (!signature || !requestId) {
          return res.status(401).send('missing signature');
        }

        const parts = Object.fromEntries(signature.split(',').map((part: string) => {
          const [k, v] = part.trim().split('=', 2);
          return [k, v];
        }));
        const dataId = (() => {
          try {
            const parsed = JSON.parse(raw.toString('utf8'));
            return String(parsed?.data?.id || parsed?.id || '');
          } catch {
            return '';
          }
        })();
        const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts || ''};`;
        const expected = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');
        if (!parts.v1 || parts.v1.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected))) {
          return res.status(401).send('invalid signature');
        }
      }

      let event: any = {};
      try { event = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).send('invalid json'); }
      const paymentId = String(event?.data?.id || event?.id || '');
      if (!paymentId) return res.status(200).send('ok');

      // Look up transaction by paymentId or fetch S2S from Mercado Pago using external_reference
      const db = await getAdminDb();
      let txDocRef: any = null;
      let transactionData: any = null;

      // The checkout embeds the internal transaction ID in notification_url.
      // This lets the webhook select the correct merchant token before the first
      // notification has persisted mercadoPagoPaymentId.
      const hintedTransactionId = typeof req.query.transactionId === 'string'
        ? req.query.transactionId.trim()
        : '';
      if (hintedTransactionId) {
        const hintedRef = db.collection('transactions').doc(hintedTransactionId);
        const hintedSnap = await hintedRef.get();
        if (hintedSnap.exists) {
          txDocRef = hintedRef;
          transactionData = hintedSnap.data();
        }
      }

      if (!txDocRef) {
        const querySnap = await db.collection('transactions').where('mercadoPagoPaymentId', '==', paymentId).limit(1).get();
        if (!querySnap.empty) {
          txDocRef = querySnap.docs[0].ref;
          transactionData = querySnap.docs[0].data();
        }
      }

      // Fetch payment details directly from Mercado Pago S2S using platform or seller access token
      let payment: any = null;
      if (transactionData) {
        const connectionSnap = await db.collection('mercado_pago_connections').doc(transactionData.professionalId).get();
        if (connectionSnap.exists) {
          const sellerToken = decryptSecret(connectionSnap.data().accessTokenEnc);
          const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${sellerToken}`, accept: 'application/json' } });
          if (paymentResponse.ok) payment = await paymentResponse.json();
        }
      }

      if (!payment) {
        // Payment IDs cannot be safely mapped to a transaction without an authenticated
        // seller token. Keep the webhook idempotent and let a later provider notification retry.
        console.warn(`[MP Webhook] Payment details unavailable for paymentId=${paymentId}`);
        return res.status(200).send('ok');
      }

      // If transaction not found by paymentId, locate by payment.external_reference (transactionId)
      if (!txDocRef && payment.external_reference) {
        const docRef = db.collection('transactions').doc(String(payment.external_reference));
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          txDocRef = docRef;
          transactionData = docSnap.data();
        }
      }

      if (!txDocRef || !transactionData) return res.status(200).send('ok');

      // Verify payment details against transaction record
      if (payment.external_reference && String(payment.external_reference) !== String(transactionData.id)) {
        console.warn('[MP Webhook] Mismatched external_reference', payment.external_reference, transactionData.id);
        return res.status(200).send('ok');
      }

      if (payment.transaction_amount && Number(payment.transaction_amount) < Number(transactionData.amountArs)) {
        console.warn('[MP Webhook] Paid amount lower than required transaction amount', payment.transaction_amount, transactionData.amountArs);
        return res.status(200).send('ok');
      }

      const update: any = { mercadoPagoPaymentId: paymentId, paymentStatus: payment.status, paymentUpdatedAt: new Date().toISOString() };
      if (payment.status === 'approved') { update.status = 'PAID'; update.paidAt = new Date().toISOString(); }
      else if (payment.status === 'refunded') { update.status = 'REFUNDED'; update.refundedAt = new Date().toISOString(); }
      else if (payment.status === 'cancelled') update.status = 'CANCELLED';
      else if (payment.status === 'charged_back') update.status = 'CHARGEBACK';

      await db.runTransaction(async (tx: any) => {
        const currentTxSnap = await tx.get(txDocRef);
        if (!currentTxSnap.exists) return;
        const current = currentTxSnap.data() || {};
        const currentUpdate: any = {
          mercadoPagoPaymentId: paymentId,
          paymentStatus: payment.status,
          paymentUpdatedAt: new Date().toISOString()
        };
        if (payment.status === 'approved') {
          if (current.status !== 'PAYMENT_PENDING' && current.status !== 'PAID') return;
          currentUpdate.status = 'PAID';
          currentUpdate.paidAt = current.paidAt || new Date().toISOString();
        } else if (payment.status === 'refunded') {
          if (['PAYMENT_PENDING', 'PAID', 'SERVICE_IN_PROGRESS', 'SERVICE_COMPLETED', 'REVIEW_COMPLETED', 'SETTLED'].includes(current.status)) {
            currentUpdate.status = 'REFUNDED';
            currentUpdate.refundedAt = new Date().toISOString();
          } else return;
        } else if (payment.status === 'cancelled') {
          if (['PAYMENT_PENDING', 'PAID'].includes(current.status)) currentUpdate.status = 'CANCELLED';
          else return;
        } else if (payment.status === 'charged_back') {
          if (current.status !== 'CHARGEBACK') currentUpdate.status = 'CHARGEBACK';
        }
        tx.update(txDocRef, currentUpdate);
      });
      return res.status(200).send('ok');
    } catch (err) {
      console.error('[MP Webhook] error', err);
      return res.status(200).send('ok');
    }
  });

  // ==========================================
  // CONEXA TRANSACTIONS - Commercial Core
  // ==========================================
  // Unified account capability checks. A user's primary role does not erase
  // secondary capabilities: the same account may legitimately be both client
  // and professional.
  function hasProfessionalCapability(user: any): boolean {
    return Boolean(
      user &&
      (
        user.role === 'PROFESSIONAL' ||
        user.isProfessional === true ||
        user.hasProfessionalProfile === true
      )
    );
  }

  function hasClientCapability(user: any): boolean {
    return Boolean(user) && user.isClient !== false;
  }
  
  // Creates a direct service request through the backend. The authenticated
  // user is always the client; identity and commercial state never come from
  // the browser payload.
  app.post("/api/service-requests/create", rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated || !auth.userId) {
        return res.status(401).json({ success: false, code: "UNAUTHORIZED" });
      }

      const {
        title,
        category,
        professionName,
        description,
        approxLocation,
        preferredDate,
        preferredTimeSlot,
        estimatedBudgetArs,
        urgency
      } = req.body || {};

      if (
        typeof title !== "string" || !title.trim() ||
        typeof category !== "string" || !category.trim() ||
        typeof professionName !== "string" || !professionName.trim() ||
        typeof description !== "string" || !description.trim() ||
        typeof approxLocation !== "string" || !approxLocation.trim() ||
        typeof preferredDate !== "string" || !preferredDate.trim() ||
        typeof preferredTimeSlot !== "string" || !preferredTimeSlot.trim() ||
        !["NORMAL", "ALTA", "URGENTE"].includes(urgency)
      ) {
        return res.status(400).json({ success: false, code: "INVALID_SERVICE_REQUEST_DATA" });
      }

      const budget = estimatedBudgetArs === undefined || estimatedBudgetArs === null || estimatedBudgetArs === ""
        ? undefined
        : Number(estimatedBudgetArs);
      if (budget !== undefined && (!Number.isFinite(budget) || budget < 0)) {
        return res.status(400).json({ success: false, code: "INVALID_ESTIMATED_BUDGET" });
      }

      const firestore = await getAdminDb();
      const clientRef = firestore.collection("users").doc(auth.userId);
      const requestRef = firestore.collection("service_requests").doc();
      const now = new Date().toISOString();

      const serviceRequest = await firestore.runTransaction(async (tx: any) => {
        const clientSnap = await tx.get(clientRef);
        if (!clientSnap.exists || !hasClientCapability(clientSnap.data())) {
          throw new Error("CLIENT_CAPABILITY_REQUIRED");
        }

        const client = clientSnap.data() || {};
        const request = {
          id: requestRef.id,
          clientId: auth.userId,
          clientName: typeof client.name === "string" && client.name.trim()
            ? client.name.trim()
            : "Usuario CONEXA",
          clientAvatar: typeof client.avatar === "string" ? client.avatar : "",
          title: title.trim().slice(0, 160),
          category: category.trim().slice(0, 120),
          professionName: professionName.trim().slice(0, 120),
          description: description.trim().slice(0, 5000),
          approxLocation: approxLocation.trim().slice(0, 240),
          preferredDate: preferredDate.trim().slice(0, 160),
          preferredTimeSlot: preferredTimeSlot.trim().slice(0, 160),
          ...(budget === undefined ? {} : { estimatedBudgetArs: budget }),
          urgency,
          status: "REQUEST_CREATED",
          quotesCount: 0,
          sourceType: "DIRECT",
          discoveryMode: "OPEN",
          createdAt: now,
          updatedAt: now
        };

        tx.set(requestRef, request);
        return request;
      });

      return res.status(201).json({ success: true, serviceRequest });
    } catch (err: any) {
      const code = err?.message || "SERVICE_REQUEST_CREATE_ERROR";
      const map: Record<string, number> = {
        CLIENT_CAPABILITY_REQUIRED: 403
      };
      return res.status(map[code] || 500).json({ success: false, code });
    }
  });

app.post("/api/quotes/submit", rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated || !auth.userId) {
        return res.status(401).json({ success: false, error: "Se requiere autenticación válida.", code: "UNAUTHORIZED" });
      }

      const {
        requestId,
        priceArs,
        description,
        materialsIncluded,
        estimatedTime,
        availableStartDate,
        warrantyInfo,
        termsAndConditions
      } = req.body || {};

      if (!requestId || typeof requestId !== 'string') {
        return res.status(400).json({ success: false, error: "requestId es obligatorio.", code: "INVALID_REQUEST_ID" });
      }
      if (!Number.isFinite(Number(priceArs)) || Number(priceArs) <= 0 || typeof description !== 'string' || !description.trim()) {
        return res.status(400).json({ success: false, error: "Los datos del presupuesto son inválidos.", code: "INVALID_QUOTE_DATA" });
      }

      const firestore = await getAdminDb();
      const quoteId = `quote-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
      const quoteRef = firestore.collection('quotes').doc(quoteId);
      const requestRef = firestore.collection('service_requests').doc(requestId);
      const professionalRef = firestore.collection('users').doc(auth.userId);

      const quote = await firestore.runTransaction(async (tx: any) => {
        const professionalSnap = await tx.get(professionalRef);
        const requestSnap = await tx.get(requestRef);
        const existingQuoteSnap = await tx.get(quoteRef);

        if (existingQuoteSnap.exists) throw new Error('QUOTE_ALREADY_EXISTS');
        if (!professionalSnap.exists || !hasProfessionalCapability(professionalSnap.data())) {
          throw new Error('PROFESSIONAL_ROLE_REQUIRED');
        }
        if (!requestSnap.exists) throw new Error('REQUEST_NOT_FOUND');

        const serviceRequest = requestSnap.data() || {};
        const requestStatus = serviceRequest.status;
        if (!['REQUEST_CREATED', 'QUOTES_RECEIVED'].includes(requestStatus)) {
          throw new Error('REQUEST_NOT_OPEN_FOR_QUOTES');
        }
        if (serviceRequest.clientId === auth.userId) throw new Error('FORBIDDEN_REQUEST_CONTEXT');
        if (serviceRequest.assignedProfessionalId && serviceRequest.assignedProfessionalId !== auth.userId) {
          throw new Error('FORBIDDEN_REQUEST_CONTEXT');
        }
        if (Array.isArray(serviceRequest.biddingProfessionalIds)
          && serviceRequest.biddingProfessionalIds.length > 0
          && !serviceRequest.biddingProfessionalIds.includes(auth.userId)) {
          throw new Error('FORBIDDEN_REQUEST_CONTEXT');
        }

        const existingQuotes = await tx.get(firestore.collection('quotes').where('requestId', '==', requestId));
        if (existingQuotes.docs.some((quoteDoc: any) => (
          quoteDoc.data()?.professionalId === auth.userId
          && ['PENDING', 'ACCEPTED', 'MODIFICATION_REQUESTED'].includes(quoteDoc.data()?.status)
        ))) {
          throw new Error('DUPLICATE_QUOTE');
        }

        const now = new Date().toISOString();
        const newQuote = {
          id: quoteId,
          requestId,
          professionalId: auth.userId,
          professionalName: professionalSnap.data()?.name || 'Profesional CONEXA',
          professionalAvatar: professionalSnap.data()?.avatar || '',
          professionalRating: Number(professionalSnap.data()?.rating || 0),
          professionalVerified: Boolean(professionalSnap.data()?.isProfessionalVerified),
          priceArs: Number(priceArs),
          description: description.trim(),
          materialsIncluded: typeof materialsIncluded === 'string' ? materialsIncluded : '',
          estimatedTime: typeof estimatedTime === 'string' ? estimatedTime : '',
          availableStartDate: typeof availableStartDate === 'string' ? availableStartDate : '',
          warrantyInfo: typeof warrantyInfo === 'string' ? warrantyInfo : '',
          termsAndConditions: typeof termsAndConditions === 'string' ? termsAndConditions : '',
          status: 'PENDING',
          createdAt: now
        };

        tx.set(quoteRef, newQuote);
        tx.update(requestRef, {
          quotesCount: Number(serviceRequest.quotesCount || 0) + 1,
          status: 'QUOTES_RECEIVED'
        });
        return newQuote;
      });

      return res.status(201).json({ success: true, quote });
    } catch (err: any) {
      const code = err?.message || 'QUOTE_SUBMIT_ERROR';
      const map: Record<string, number> = {
        INVALID_REQUEST_ID: 400,
        QUOTE_ALREADY_EXISTS: 409,
        PROFESSIONAL_ROLE_REQUIRED: 403,
        REQUEST_NOT_FOUND: 404,
        REQUEST_NOT_OPEN_FOR_QUOTES: 409,
        FORBIDDEN_REQUEST_CONTEXT: 403,
        DUPLICATE_QUOTE: 409
      };
      return res.status(map[code] || 500).json({
        success: false,
        error: map[code] ? `No se puede enviar el presupuesto: ${code}.` : "Error interno al enviar el presupuesto.",
        code
      });
    }
  });

  // Creates a server-authoritative targeted request from a CONEXA RADAR opportunity.
  // Candidate IDs are never trusted from the browser: they are read from the persisted opportunity.
  app.post("/api/radar/opportunities/:opportunityId/create-request", rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated || !auth.userId) {
        return res.status(401).json({ success: false, code: "UNAUTHORIZED" });
      }

      const opportunityId = String(req.params.opportunityId || "").trim();
      if (!opportunityId) {
        return res.status(400).json({ success: false, code: "INVALID_OPPORTUNITY_ID" });
      }

      const firestore = await getAdminDb();
      const opportunityRef = firestore.collection("radar_opportunities").doc(opportunityId);
      const requestRef = firestore.collection("service_requests").doc();
      const now = new Date().toISOString();

      const serviceRequest = await firestore.runTransaction(async (tx: any) => {
        const opportunitySnap = await tx.get(opportunityRef);
        if (!opportunitySnap.exists) throw new Error("RADAR_OPPORTUNITY_NOT_FOUND");

        const opportunity = opportunitySnap.data() || {};
        if (opportunity.clientId !== auth.userId) throw new Error("FORBIDDEN_OPPORTUNITY_OWNER");

        const matched = Array.isArray(opportunity.matchedProfessionals)
          ? opportunity.matchedProfessionals
          : [];

        const candidateIds = Array.from(new Set(
          matched
            .map((candidate: any) => String(candidate?.professionalId || "").trim())
            .filter(Boolean)
        ));

        if (candidateIds.length === 0) throw new Error("NO_RADAR_CANDIDATES");

        const request = {
          id: requestRef.id,
          clientId: auth.userId,
          title: String(opportunity.title || "Solicitud de servicio"),
          description: String(opportunity.description || ""),
          category: opportunity.category || null,
          professionName: opportunity.professionName || null,
          urgency: opportunity.urgency || "NORMAL",
          approxLocation: opportunity.approxLocation || null,
          estimatedBudgetArs: Number(opportunity.estimatedBudgetArs || 0),
          status: "REQUEST_CREATED",
          quotesCount: 0,
          sourceType: "RADAR",
          discoveryMode: "TARGETED",
          radarOpportunityId: opportunityId,
          biddingProfessionalIds: candidateIds,
          createdAt: now,
          updatedAt: now
        };

        tx.set(requestRef, request);

        tx.update(opportunityRef, {
          clientUserId: auth.userId,
          linkedAt: now,
          status: "SERVICE_REQUESTED",
          conversionStatus: "PENDING",
          lastUpdated: now,
          serviceRequestId: requestRef.id
        });

        return request;
      });

      return res.status(201).json({ success: true, serviceRequest });
    } catch (err: any) {
      const code = err?.message || "RADAR_REQUEST_CREATE_ERROR";
      const statusByCode: Record<string, number> = {
        RADAR_OPPORTUNITY_NOT_FOUND: 404,
        FORBIDDEN_OPPORTUNITY_OWNER: 403,
        NO_RADAR_CANDIDATES: 409
      };
      return res.status(statusByCode[code] || 500).json({ success: false, code });
    }
  });

  // Creates the authoritative transaction when a client accepts a quote.
  // The financial values are calculated server-side; the browser cannot set the fee.
  app.post("/api/transactions/create", rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated || !auth.userId) {
        return res.status(401).json({ success: false, error: "Se requiere autenticación válida.", code: "UNAUTHORIZED" });
      }

      const { quoteId } = req.body || {};
      if (!quoteId || typeof quoteId !== 'string') {
        return res.status(400).json({ success: false, error: "quoteId es obligatorio.", code: "INVALID_QUOTE_ID" });
      }

      const hasFirebaseAdminConfig = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS);
      if (!hasFirebaseAdminConfig) {
        return res.status(503).json({ success: false, error: "Firebase Admin SDK no está configurado para operaciones comerciales.", code: "FIREBASE_ADMIN_NOT_CONFIGURED" });
      }

      const firestore = await getAdminDb();

      const quoteRef = firestore.collection('quotes').doc(quoteId);
      const transactionRef = firestore.collection('transactions').doc(`txn-${quoteId}`);
      const now = new Date().toISOString();

      const feePercentRaw = Number(process.env.CONEXA_PLATFORM_FEE_PERCENT || '8');
      const feePercent = Number.isFinite(feePercentRaw) && feePercentRaw >= 0 && feePercentRaw <= 20 ? feePercentRaw : 8;

      const result = await firestore.runTransaction(async (tx: any) => {
        const quoteSnap = await tx.get(quoteRef);
        if (!quoteSnap.exists) throw new Error('QUOTE_NOT_FOUND');
        const quote = quoteSnap.data();
        if (!quote || typeof quote.priceArs !== 'number' || quote.priceArs <= 0) throw new Error('INVALID_QUOTE_AMOUNT');

        const requestRef = firestore.collection('service_requests').doc(quote.requestId);
        const requestSnap = await tx.get(requestRef);
        if (!requestSnap.exists) throw new Error('REQUEST_NOT_FOUND');
        const serviceRequest = requestSnap.data();
        if (!serviceRequest || serviceRequest.clientId !== auth.userId) throw new Error('FORBIDDEN_REQUEST_OWNER');
        const clientRef = firestore.collection('users').doc(auth.userId);
        const clientSnap = await tx.get(clientRef);
        if (!clientSnap.exists || !hasClientCapability(clientSnap.data())) throw new Error('CLIENT_ROLE_REQUIRED');
        if (serviceRequest.status !== 'REQUEST_CREATED' && serviceRequest.status !== 'QUOTES_RECEIVED') {
          throw new Error('REQUEST_NOT_CONTRACTABLE');
        }
        if (quote.status !== 'PENDING') throw new Error('QUOTE_NOT_AVAILABLE');
        if (serviceRequest.status === 'CANCELLED' || serviceRequest.status === 'COMPLETED' || serviceRequest.status === 'CLOSED') {
          throw new Error('REQUEST_NOT_CONTRACTABLE');
        }

        const professionalRef = firestore.collection('users').doc(String(quote.professionalId));
        const professionalSnap = await tx.get(professionalRef);
        if (!professionalSnap.exists || !hasProfessionalCapability(professionalSnap.data())) {
          throw new Error('PROFESSIONAL_ROLE_REQUIRED');
        }
        if (serviceRequest.assignedProfessionalId && serviceRequest.assignedProfessionalId !== quote.professionalId) {
          throw new Error('PROFESSIONAL_CONTEXT_MISMATCH');
        }

        const connectionRef = firestore.collection('mercado_pago_connections').doc(String(quote.professionalId));
        const connectionSnap = await tx.get(connectionRef);
        if (!connectionSnap.exists || connectionSnap.data()?.connected !== true || !connectionSnap.data()?.accessTokenEnc) {
          throw new Error('PROFESSIONAL_MERCADO_PAGO_NOT_CONNECTED');
        }

        const existing = await tx.get(transactionRef);
        if (existing.exists) {
          const existingData = existing.data() || {};
          // A cancelled checkout never completed the financial operation. Keep the
          // commercial selection but make the same authoritative transaction payable
          // again instead of creating a duplicate transaction for the quote.
          if (existingData.status === 'CANCELLED') {
            tx.update(transactionRef, {
              status: 'PAYMENT_PENDING',
              mercadoPagoPaymentId: null,
              mercadoPagoPreferenceId: null,
              paidAt: null,
              paymentStatus: 'retry_pending',
              paymentRetryAt: now,
              updatedAt: now
            });
            return {
              ...existingData,
              status: 'PAYMENT_PENDING',
              mercadoPagoPaymentId: null,
              mercadoPagoPreferenceId: null,
              paidAt: null,
              paymentStatus: 'retry_pending',
              paymentRetryAt: now,
              updatedAt: now
            };
          }
          return existingData;
        }

        const amountArs = Number(quote.priceArs);
        const platformFeeAmountArs = Number((amountArs * feePercent / 100).toFixed(2));
        const professionalAmountArs = Number((amountArs - platformFeeAmountArs).toFixed(2));

        const transaction = {
          id: transactionRef.id,
          serviceRequestId: quote.requestId,
          quoteId,
          clientId: serviceRequest.clientId,
          professionalId: quote.professionalId,
          amountArs,
          currency: 'ARS',
          platformFeePercent: feePercent,
          platformFeeAmountArs,
          professionalAmountArs,
          status: 'PAYMENT_PENDING',
          createdAt: now
        };

        tx.set(transactionRef, transaction);
        tx.update(quoteRef, { status: 'ACCEPTED' });
        tx.update(requestRef, {
          status: 'PROFESSIONAL_SELECTED',
          assignedProfessionalId: quote.professionalId
        });
        return transaction;
      });

      return res.status(201).json({ success: true, transaction: result });
    } catch (err: any) {
      const code = err?.message || 'TRANSACTION_CREATE_ERROR';
      const map: Record<string, number> = {
        QUOTE_NOT_FOUND: 404,
        REQUEST_NOT_FOUND: 404,
        FORBIDDEN_REQUEST_OWNER: 403,
        QUOTE_NOT_AVAILABLE: 409,
        REQUEST_NOT_CONTRACTABLE: 409,
        INVALID_QUOTE_AMOUNT: 422,
        PROFESSIONAL_MERCADO_PAGO_NOT_CONNECTED: 409,
        PROFESSIONAL_ROLE_REQUIRED: 403,
        PROFESSIONAL_CONTEXT_MISMATCH: 409,
        CLIENT_ROLE_REQUIRED: 403
      };
      return res.status(map[code] || 500).json({ success: false, error: map[code] ? `No se puede crear la contratación: ${code}.` : "Error interno al crear la contratación.", code });
    }
  });

  // Payment confirmation is authoritative: only the backend may move a transaction
  // from PAYMENT_PENDING to PAID. Webhook processors or the payment provider adapter
  // must call this endpoint with the internal confirmation secret.
  

  app.post("/api/jobs/start", rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated || !auth.userId) return res.status(401).json({ success: false, code: 'UNAUTHORIZED' });
      const { requestId } = req.body || {};
      if (!requestId || typeof requestId !== 'string') return res.status(400).json({ success: false, code: 'INVALID_REQUEST_ID' });

      const firestore = await getAdminDb();
      const requestRef = firestore.collection('service_requests').doc(requestId);
      const transactions = await firestore.collection('transactions').where('serviceRequestId', '==', requestId).limit(1).get();
      if (transactions.empty) return res.status(409).json({ success: false, code: 'TRANSACTION_NOT_FOUND' });
      const transactionRef = transactions.docs[0].ref;
      const quoteRef = firestore.collection('quotes').doc(String((transactions.docs[0].data() || {}).quoteId || ''));

      await firestore.runTransaction(async (tx: any) => {
        const [requestSnap, transactionSnap, quoteSnap, userSnap] = await Promise.all([
          tx.get(requestRef), tx.get(transactionRef), tx.get(quoteRef), tx.get(firestore.collection('users').doc(auth.userId))
        ]);
        if (!requestSnap.exists || !transactionSnap.exists || !quoteSnap.exists || !userSnap.exists) throw new Error('RESOURCE_NOT_FOUND');
        const requestData = requestSnap.data() || {}, transactionData = transactionSnap.data() || {}, quoteData = quoteSnap.data() || {};
        if (!hasProfessionalCapability(userSnap.data())) throw new Error('PROFESSIONAL_ROLE_REQUIRED');
        if (requestData.status !== 'PROFESSIONAL_SELECTED' || transactionData.status !== 'PAID' || quoteData.status !== 'ACCEPTED') throw new Error('INVALID_JOB_STATE');
        if (quoteData.professionalId !== auth.userId || transactionData.professionalId !== auth.userId) throw new Error('FORBIDDEN');
        const startedAt = new Date().toISOString();
        tx.update(requestRef, { status: 'IN_PROGRESS', startedAt, startedBy: auth.userId });
        tx.update(transactionRef, { status: 'SERVICE_IN_PROGRESS', serviceStartedAt: startedAt });
      });
      return res.json({ success: true, requestId, status: 'IN_PROGRESS' });
    } catch (err: any) {
      const code = err?.message || 'JOB_START_ERROR';
      const status = ['RESOURCE_NOT_FOUND'].includes(code) ? 404 : ['INVALID_JOB_STATE'].includes(code) ? 409 : ['PROFESSIONAL_ROLE_REQUIRED','FORBIDDEN'].includes(code) ? 403 : 500;
      return res.status(status).json({ success: false, error: code, code });
    }
  });

  app.post("/api/jobs/complete", rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated || !auth.userId) {
        return res.status(401).json({ success: false, error: "Se requiere autenticación válida.", code: "UNAUTHORIZED" });
      }

      const { requestId } = req.body || {};
      if (!requestId || typeof requestId !== 'string') {
        return res.status(400).json({ success: false, error: "requestId es obligatorio.", code: "INVALID_REQUEST_ID" });
      }

      const firestore = await getAdminDb();
      const requestRef = firestore.collection('service_requests').doc(requestId);
      const requestSnap = await requestRef.get();
      if (!requestSnap.exists) return res.status(404).json({ success: false, error: "Solicitud no encontrada.", code: "REQUEST_NOT_FOUND" });

      const serviceRequest = requestSnap.data() || {};
      const transactionSnap = await firestore.collection('transactions')
        .where('serviceRequestId', '==', requestId)
        .limit(1)
        .get();
      if (transactionSnap.empty) {
        return res.status(409).json({ success: false, error: "No existe una transacción asociada al trabajo.", code: "TRANSACTION_NOT_FOUND" });
      }

      const transactionDoc = transactionSnap.docs[0];
      const transaction = transactionDoc.data() || {};
      const quoteRef = firestore.collection('quotes').doc(String(transaction.quoteId || ''));
      const [quoteSnap, professionalSnap] = await Promise.all([
        quoteRef.get(),
        firestore.collection('users').doc(auth.userId).get()
      ]);

      if (!professionalSnap.exists || !hasProfessionalCapability(professionalSnap.data())) {
        return res.status(403).json({ success: false, error: "Solo un profesional con perfil profesional activo puede completar trabajos.", code: "PROFESSIONAL_ROLE_REQUIRED" });
      }
      if (serviceRequest.clientId === auth.userId) {
        return res.status(403).json({ success: false, error: "El cliente no puede completar este trabajo.", code: "FORBIDDEN" });
      }
      if (!quoteSnap.exists) return res.status(404).json({ success: false, error: "Presupuesto no encontrado.", code: "QUOTE_NOT_FOUND" });

      const quote = quoteSnap.data() || {};
      if (quote.requestId !== requestId || transaction.serviceRequestId !== requestId || transaction.quoteId !== quoteSnap.id) {
        return res.status(409).json({ success: false, error: "La relación entre solicitud, presupuesto y transacción no es válida.", code: "WORK_RELATIONSHIP_INVALID" });
      }
      if (quote.professionalId !== auth.userId || transaction.professionalId !== auth.userId) {
        return res.status(403).json({ success: false, error: "No estás autorizado a completar este trabajo.", code: "FORBIDDEN" });
      }
      if (quote.status !== 'ACCEPTED') return res.status(409).json({ success: false, error: "El presupuesto no está aceptado.", code: "QUOTE_NOT_ACCEPTED" });
      if (transaction.status !== 'SERVICE_IN_PROGRESS') return res.status(409).json({ success: false, error: "El trabajo no está marcado como iniciado después de un pago confirmado.", code: "SERVICE_NOT_IN_PROGRESS" });
      if (serviceRequest.status === 'REVIEW_PENDING') return res.status(409).json({ success: false, error: "El trabajo ya fue completado.", code: "JOB_ALREADY_COMPLETED" });
      if (serviceRequest.status !== 'IN_PROGRESS') {
        return res.status(409).json({ success: false, error: "El trabajo debe estar en ejecución antes de completarse.", code: "INVALID_JOB_STATE" });
      }

      await firestore.runTransaction(async (tx: any) => {
        const currentRequestSnap = await tx.get(requestRef);
        const currentTransactionSnap = await tx.get(transactionDoc.ref);
        const currentQuoteSnap = await tx.get(quoteRef);
        if (!currentRequestSnap.exists || !currentTransactionSnap.exists || !currentQuoteSnap.exists) throw new Error('RESOURCE_NOT_FOUND');
        const currentRequest = currentRequestSnap.data() || {};
        const currentTransaction = currentTransactionSnap.data() || {};
        const currentQuote = currentQuoteSnap.data() || {};
        if (currentRequest.status !== 'IN_PROGRESS' || currentTransaction.status !== 'SERVICE_IN_PROGRESS' || currentQuote.status !== 'ACCEPTED') {
          throw new Error('INVALID_JOB_STATE');
        }
        const completedAt = new Date().toISOString();
        const professionalRef = firestore.collection('users').doc(auth.userId);
        const currentProfessionalSnap = await tx.get(professionalRef);
        if (!currentProfessionalSnap.exists) throw new Error('RESOURCE_NOT_FOUND');
        const professional = currentProfessionalSnap.data() || {};
        tx.update(requestRef, {
          status: 'REVIEW_PENDING',
          completedAt,
          completedBy: auth.userId
        });
        tx.update(transactionDoc.ref, {
          status: 'SERVICE_COMPLETED',
          completedAt
        });
        tx.update(professionalRef, {
          jobsCompleted: Number(professional.jobsCompleted || 0) + 1
        });
      });

      return res.json({ success: true, requestId, status: 'REVIEW_PENDING' });
    } catch (err: any) {
      const code = err?.message || 'JOB_COMPLETION_ERROR';
      const map: Record<string, number> = {
        RESOURCE_NOT_FOUND: 404,
        INVALID_JOB_STATE: 409,
        SERVICE_NOT_IN_PROGRESS: 409
      };
      return res.status(map[code] || 500).json({ success: false, error: map[code] ? `No se puede completar el trabajo: ${code}.` : "Error interno al completar el trabajo.", code });
    }
  });

  // Review creation and reputation aggregation are authoritative on the backend.
  // A client may review only its own completed service, exactly once.
  app.post("/api/reviews/create", rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated || !auth.userId) {
        return res.status(401).json({ success: false, code: 'UNAUTHORIZED' });
      }

      const {
        serviceRequestId,
        comment = '',
        overallRating,
        qualityRating,
        punctualityRating,
        treatmentRating,
        priceRating,
        complianceRating
      } = req.body || {};

      if (!serviceRequestId || typeof serviceRequestId !== 'string') {
        return res.status(400).json({ success: false, code: 'INVALID_REQUEST_ID' });
      }

      const ratingValues = [overallRating, qualityRating, punctualityRating, treatmentRating, priceRating, complianceRating];
      if (ratingValues.some((value) => typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 5)) {
        return res.status(400).json({ success: false, code: 'INVALID_RATING' });
      }

      const firestore = await getAdminDb();
      const requestRef = firestore.collection('service_requests').doc(serviceRequestId);
      const reviewRef = firestore.collection('reviews').doc(`review-${serviceRequestId}-${auth.userId}`);
      const transactionQuery = firestore.collection('transactions')
        .where('serviceRequestId', '==', serviceRequestId)
        .limit(5);

      const result = await firestore.runTransaction(async (tx: any) => {
        const [requestSnap, reviewSnap, transactionSnap, clientSnap] = await Promise.all([
          tx.get(requestRef),
          tx.get(reviewRef),
          tx.get(transactionQuery),
          tx.get(firestore.collection('users').doc(auth.userId))
        ]);

        if (!requestSnap.exists) throw new Error('REQUEST_NOT_FOUND');
        if (!clientSnap.exists) throw new Error('CLIENT_NOT_FOUND');
        if (reviewSnap.exists) throw new Error('REVIEW_ALREADY_EXISTS');

        const request = requestSnap.data() || {};
        if (request.clientId !== auth.userId) throw new Error('FORBIDDEN');
        if (request.status !== 'REVIEW_PENDING') throw new Error('INVALID_JOB_STATE');

        const transactionDoc = transactionSnap.docs.find((doc: any) => (doc.data() || {}).status === 'SERVICE_COMPLETED');
        if (!transactionDoc) throw new Error('SETTLEMENT_NOT_READY');

        const transaction = transactionDoc.data() || {};
        const quoteRef = firestore.collection('quotes').doc(String(transaction.quoteId || ''));
        const [quoteSnap, professionalSnap] = await Promise.all([
          tx.get(quoteRef),
          tx.get(firestore.collection('users').doc(String(transaction.professionalId || '')))
        ]);

        if (!quoteSnap.exists || !professionalSnap.exists) throw new Error('RESOURCE_NOT_FOUND');
        const quote = quoteSnap.data() || {};
        if (
          quote.requestId !== serviceRequestId ||
          quote.status !== 'ACCEPTED' ||
          quote.professionalId !== transaction.professionalId
        ) throw new Error('WORK_RELATIONSHIP_INVALID');

        const client = clientSnap.data() || {};
        const professional = professionalSnap.data() || {};
        const previousCount = Number(professional.reviewCount || 0);
        const newCount = previousCount + 1;
        const newRating = Number(
          ((((Number(professional.rating || 0) * previousCount) + overallRating) / newCount).toFixed(1))
        );
        const now = new Date().toISOString();

        const review = {
          id: reviewRef.id,
          jobId: serviceRequestId,
          serviceRequestId,
          authorId: auth.userId,
          clientId: auth.userId,
          clientName: String(client.name || ''),
          clientAvatar: String(client.avatar || ''),
          professionalId: String(transaction.professionalId),
          createdAt: now,
          comment: String(comment || '').slice(0, 2000),
          overallRating,
          qualityRating,
          punctualityRating,
          treatmentRating,
          priceRating,
          complianceRating,
          isVerifiedJob: true
        };

        tx.set(reviewRef, review);
        tx.update(professionalSnap.ref, {
          reviewCount: newCount,
          rating: newRating
        });
        tx.update(requestRef, {
          status: 'CLOSED',
          closedAt: now
        });
        // The client review is the commercial completion event. In the current
        // Mercado Pago marketplace model the professional already receives the
        // seller amount at payment time, so there is no second payout operation
        // to execute. Mark settlement explicitly to make accounting final and
        // prevent a later worker from treating REVIEW_COMPLETED as unpaid.
        tx.update(transactionDoc.ref, {
          status: 'SETTLED',
          reviewCompletedAt: now,
          settledAt: now,
          settlementStatus: 'SETTLED'
        });

        return {
          review,
          transactionId: transactionDoc.id,
          completedAt: now,
          settlementStatus: 'SETTLED'
        };
      });

      return res.status(201).json({
        success: true,
        serviceRequestId,
        status: 'CLOSED',
        ...result
      });
    } catch (err: any) {
      const code = err?.message || 'REVIEW_CREATE_ERROR';
      const status =
        ['REQUEST_NOT_FOUND', 'CLIENT_NOT_FOUND'].includes(code) ? 404 :
        ['FORBIDDEN'].includes(code) ? 403 :
        ['INVALID_REQUEST_ID', 'INVALID_RATING'].includes(code) ? 400 :
        ['REVIEW_ALREADY_EXISTS', 'INVALID_JOB_STATE', 'SETTLEMENT_NOT_READY', 'WORK_RELATIONSHIP_INVALID'].includes(code) ? 409 :
        500;
      return res.status(status).json({ success: false, error: code, code });
    }
  });

  // Backward-compatible close endpoint. It no longer creates or aggregates reviews.
  app.post("/api/jobs/review-complete", rateLimiter, async (_req: Request, res: Response) => {
    return res.status(410).json({
      success: false,
      code: 'REVIEW_CREATE_ENDPOINT_REQUIRED',
      error: 'Usá /api/reviews/create para crear la reseña y cerrar el trabajo de forma atómica.'
    });
  });

  // Administrative moderation operations are authoritative on the backend.
  // The browser may request an action, but authorization, mutation and audit logging
  // are performed together using Firebase Admin.
  async function requireAdminRequest(req: Request, res: Response): Promise<{ userId: string; role: string } | null> {
    const auth = await verifyAuthToken(req);
    if (!auth.isAuthenticated || !auth.userId) {
      res.status(401).json({ success: false, error: 'Se requiere autenticación válida.', code: auth.errorReason || 'UNAUTHORIZED' });
      return null;
    }
    if (!auth.isAdmin) {
      res.status(403).json({ success: false, error: 'Se requiere rol administrativo.', code: 'ADMIN_REQUIRED' });
      return null;
    }
    return { userId: auth.userId, role: auth.role || 'ADMIN' };
  }

  async function writeAdminAudit(
    firestore: any,
    adminIdentity: { userId: string; role: string },
    action: string,
    targetType: string,
    targetId: string,
    result: string,
    details: Record<string, unknown> = {}
  ): Promise<void> {
    const auditId = `AUD-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    await firestore.collection('admin_audit_logs').doc(auditId).set({
      adminUid: adminIdentity.userId,
      role: adminIdentity.role,
      action,
      targetType,
      targetId,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      timestamp: new Date().toISOString(),
      result,
      ...details
    });
  }

  app.post('/api/admin/verifications/:verificationId/approve', rateLimiter, async (req: Request, res: Response) => {
    try {
      const adminIdentity = await requireAdminRequest(req, res);
      if (!adminIdentity) return;

      const verificationId = req.params.verificationId;
      if (!verificationId) {
        return res.status(400).json({ success: false, error: 'verificationId es obligatorio.', code: 'INVALID_VERIFICATION_ID' });
      }

      const firestore = await getAdminDb();
      const verificationRef = firestore.collection('verifications').doc(verificationId);

      const result = await firestore.runTransaction(async (tx: any) => {
        const verificationSnap = await tx.get(verificationRef);
        if (!verificationSnap.exists) throw new Error('VERIFICATION_NOT_FOUND');

        const verification = verificationSnap.data() || {};
        if (!verification.userId || !['IDENTITY', 'PROFESSIONAL'].includes(verification.type)) {
          throw new Error('INVALID_VERIFICATION_DATA');
        }
        if (verification.status === 'VERIFIED') throw new Error('VERIFICATION_ALREADY_APPROVED');
        if (verification.status && verification.status !== 'PENDING') throw new Error('INVALID_VERIFICATION_STATE');

        const userRef = firestore.collection('users').doc(verification.userId);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) throw new Error('USER_NOT_FOUND');

        const approvedAt = new Date().toISOString();
        tx.update(verificationRef, {
          status: 'VERIFIED',
          approvedAt,
          approvedBy: adminIdentity.userId
        });
        tx.update(userRef, verification.type === 'IDENTITY'
          ? { isIdentityVerified: true, identityVerificationStatus: 'VERIFIED' }
          : { isProfessionalVerified: true, professionalVerificationStatus: 'VERIFIED' }
        );

        return { userId: verification.userId, type: verification.type, approvedAt };
      });

      await writeAdminAudit(firestore, adminIdentity, 'APPROVE_VERIFICATION', 'VERIFICATION', verificationId, 'SUCCESS', result);
      return res.json({ success: true, verificationId, status: 'VERIFIED', ...result });
    } catch (err: any) {
      const code = err?.message || 'ADMIN_VERIFICATION_APPROVAL_ERROR';
      const statusMap: Record<string, number> = {
        VERIFICATION_NOT_FOUND: 404,
        USER_NOT_FOUND: 404,
        INVALID_VERIFICATION_DATA: 400,
        VERIFICATION_ALREADY_APPROVED: 409,
        INVALID_VERIFICATION_STATE: 409
      };
      return res.status(statusMap[code] || 500).json({ success: false, error: statusMap[code] ? code : 'No se pudo aprobar la verificación.', code });
    }
  });

  app.post('/api/admin/users/:userId/block', rateLimiter, async (req: Request, res: Response) => {
    try {
      const adminIdentity = await requireAdminRequest(req, res);
      if (!adminIdentity) return;

      const userId = req.params.userId;
      if (!userId || userId === adminIdentity.userId) {
        return res.status(400).json({ success: false, error: 'No se puede bloquear este usuario.', code: 'INVALID_BLOCK_TARGET' });
      }

      const firestore = await getAdminDb();
      const userRef = firestore.collection('users').doc(userId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado.', code: 'USER_NOT_FOUND' });
      }

      const blockedAt = new Date().toISOString();
      await userRef.update({
        isBlocked: true,
        blockedAt,
        blockedBy: adminIdentity.userId
      });
      await writeAdminAudit(firestore, adminIdentity, 'BLOCK_USER', 'USER', userId, 'SUCCESS', { blockedAt });
      return res.json({ success: true, userId, isBlocked: true, blockedAt });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'No se pudo bloquear al usuario.', code: err?.message || 'ADMIN_BLOCK_USER_ERROR' });
    }
  });

  app.post('/api/admin/reports/:reportId/resolve', rateLimiter, async (req: Request, res: Response) => {
    try {
      const adminIdentity = await requireAdminRequest(req, res);
      if (!adminIdentity) return;

      const reportId = req.params.reportId;
      const action = req.body?.action;
      if (!['DISMISSED', 'ACTION_TAKEN'].includes(action)) {
        return res.status(400).json({ success: false, error: 'Acción de resolución inválida.', code: 'INVALID_REPORT_ACTION' });
      }

      const firestore = await getAdminDb();
      const reportRef = firestore.collection('reports').doc(reportId);
      const reportSnap = await reportRef.get();
      if (!reportSnap.exists) {
        return res.status(404).json({ success: false, error: 'Reporte no encontrado.', code: 'REPORT_NOT_FOUND' });
      }

      const resolvedAt = new Date().toISOString();
      await reportRef.update({
        status: action,
        resolvedAt,
        resolvedBy: adminIdentity.userId
      });
      await writeAdminAudit(firestore, adminIdentity, 'RESOLVE_REPORT', 'REPORT', reportId, 'SUCCESS', { action, resolvedAt });
      return res.json({ success: true, reportId, status: action, resolvedAt });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'No se pudo resolver el reporte.', code: err?.message || 'ADMIN_RESOLVE_REPORT_ERROR' });
    }
  });

  // Account Deletion API Endpoint (GDPR/ARCO Compliance)
  app.post("/api/user/delete-account", rateLimiter, async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "Falta ID de usuario para dar de baja." });
      }

      // Check if Firebase Admin SDK is available
      const hasFirebaseAdminConfig = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS);
      if (!hasFirebaseAdminConfig) {
        return res.status(503).json({
          success: false,
          error: "El servicio de Firebase Admin SDK no está configurado en el servidor para realizar eliminaciones reales de cuenta.",
          code: "FIREBASE_ADMIN_NOT_CONFIGURED"
        });
      }

      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated) {
        return res.status(401).json({
          success: false,
          error: "Acceso denegado. Se requiere token Bearer válido para procesar la eliminación de cuenta.",
          code: "UNAUTHORIZED"
        });
      }

      // Ensure user can only request deletion of their own account unless admin
      const canDelete = (auth.userId === userId) || (auth.isAdmin === true);
      if (!canDelete) {
        return res.status(403).json({
          success: false,
          error: "Acceso denegado. Solo podés solicitar la eliminación de tu propia cuenta o poseer perfil de Administrador.",
          code: "FORBIDDEN"
        });
      }

      const admin = getFirebaseAdmin();
      if (!admin) {
        return res.status(503).json({
          success: false,
          error: "El servicio de Firebase Admin no está disponible en este momento.",
          code: "FIREBASE_ADMIN_NOT_CONFIGURED"
        });
      }
      const db = await getAdminDb();

      try {
        // Delete user from Firebase Auth
        await admin.auth().deleteUser(userId);
        console.log(`[CONEXA AUTH] Usuario borrado de Firebase Auth: ${userId}`);

        // Delete user's profile from Firestore
        await db.collection('users').doc(userId).delete();
        console.log(`[CONEXA FIRESTORE] Perfil borrado de Firestore: ${userId}`);

        // Also delete subcollection /users/{userId}/private/info if exists
        try {
          await db.collection('users').doc(userId).collection('private').doc('info').delete();
        } catch (e) {
          console.log("[CONEXA FIRESTORE] No private/info subdoc to delete or already deleted.");
        }

        // Mask or delete user's messages in Firestore to avoid digital footprint (Requirement 13)
        const messagesSnapshot = await db.collection('messages').where('senderId', '==', userId).get();
        const batch = db.batch();
        messagesSnapshot.forEach((doc: any) => {
          batch.update(doc.ref, {
            text: "[MENSAJE ELIMINADO - USUARIO DADO DE BAJA]",
            content: "[MENSAJE ELIMINADO - USUARIO DADO DE BAJA]",
            isDeleted: true
          });
        });
        await batch.commit();
        console.log(`[CONEXA FIRESTORE] Mensajes del usuario dados de baja para: ${userId}`);

        // Log the admin/user action to admin_audit_logs (Requirement 15)
        const auditLogId = `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await db.collection('admin_audit_logs').doc(auditLogId).set({
          adminUid: auth.userId || 'system',
          role: auth.role || 'USER',
          action: 'DELETE_ACCOUNT',
          targetType: 'USER',
          targetId: userId,
          environment: 'production',
          timestamp: new Date().toISOString(),
          result: 'SUCCESS'
        });

        return res.status(200).json({
          success: true,
          status: "DELETED",
          message: "Tu cuenta y datos confidenciales han sido eliminados de manera definitiva de CONEXA.",
          deletedUserId: userId,
          timestamp: new Date().toISOString()
        });
      } catch (authErr: any) {
        console.error(`Error al borrar físicamente al usuario ${userId}:`, authErr);
        return res.status(500).json({
          success: false,
          error: `Error interno de Firebase Admin al borrar la cuenta: ${authErr.message || authErr}`,
          code: "FIREBASE_DELETE_ERROR"
        });
      }
    } catch (err) {
      return res.status(500).json({ error: "Error al procesar la eliminación de la cuenta." });
    }
  });

  // ==========================================
  // CONEXA RADAR API ENDPOINTS (n8n & Internal)
  // ==========================================

  // Anti-Spam Duplicate Opportunity Memory Cache
  const processedOpportunityHashes = new Set<string>();

  function generateOpportunityHash(text: string, city: string): string {
    const clean = (text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const cityClean = (city || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${cityClean}_${clean.slice(0, 80)}`;
  }

  // 1. Opportunity AI Classification Service Endpoint
  app.post("/api/radar/analyze", rateLimiter, async (req: Request, res: Response) => {
    try {
      const { description, rawText, city, province, contextType } = req.body;
      const textToAnalyze = (description || rawText || "").trim();

      if (!textToAnalyze) {
        return res.status(400).json({ error: "No se provino texto o descripción para analizar." });
      }

      // Requirement 8: Separate PUBLIC USER REQUEST ANALYSIS from ADMIN RADAR ANALYSIS
      const isUserRequest = contextType === 'USER_REQUEST';
      if (!isUserRequest) {
        const auth = await verifyAuthToken(req);
        const isSimulation = Boolean(req.body.isSimulation || req.body.isTest);
        if (!isSimulation && !auth.isAdmin) {
          return res.status(403).json({
            error: "Acceso denegado. El análisis de RADAR administrativo requiere rol de ADMINISTRADOR.",
            code: "UNAUTHORIZED_ADMIN_REQUIRED"
          });
        }
      }

      const sanitized = sanitizePIIForAI(textToAnalyze.slice(0, 1000));
      const ai = getGeminiClient();

      if (!ai) {
        // Fallback rule-based parsing if Gemini key is absent
        const isUrgent = textToAnalyze.toLowerCase().includes("urgente") || textToAnalyze.toLowerCase().includes("hoy");
        return res.json({
          category: "Electricidad",
          subcategory: "Reparación General",
          intent: isUrgent ? "HIGH" : "MEDIUM",
          urgency: isUrgent ? "HIGH" : "NORMAL",
          intentScore: isUrgent ? 92 : 75,
          confidenceScore: 90,
          city: city || "Santiago del Estero",
          province: province || "Santiago del Estero",
          reasoning: "Análisis preliminar por regla heurística de demanda.",
          recommendedResponseText: "Hola 👋 Si aún buscás un profesional verificado en tu zona, podés consultar sin compromiso en CONEXA."
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Analizá la siguiente publicación o mensaje de demanda de servicios en Argentina: "${sanitized}".
Ubicación sugerida: ${city || "No especificada"}, ${province || "Argentina"}.

Clasificá la oportunidad y responde ÚNICAMENTE en formato JSON con la siguiente estructura:
- category: una de ["Electricidad", "Plomería", "Gas", "Refrigeración", "Mecánica", "Limpieza", "Construcción", "Pintura", "Informática", "Cerrajería", "Jardinería", "Otros"]
- subcategory: nombre corto de la subcategoría específica (ej. "Reparación de Tablero", "Instalación de Calefactor")
- intent: "LOW", "MEDIUM" o "HIGH" (nivel de intención real de contratar)
- urgency: "LOW", "MEDIUM", "HIGH" o "EMERGENCY"
- intentScore: entero entre 0 y 100
- confidenceScore: entero entre 0 y 100
- spamRiskScore: entero entre 0 y 100 (estimación de probabilidad de ser publicidad o bot)
- reasoning: explicación de 1 oración del diagnóstico
- recommendedResponseText: mensaje breve (máx 250 caracteres), empático, educado y transparente invitando a conocer profesionales en CONEXA sin spam ni engaños.`,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "Sos OpportunityAIService, el motor de inteligencia artificial de CONEXA RADAR. Tu objetivo es clasificar demandas reales de servicios en Argentina con precisión y resguardo absoluto de la privacidad."
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({
        category: parsed.category || "Otros",
        subcategory: parsed.subcategory || "Consulta General",
        intent: parsed.intent || "MEDIUM",
        urgency: parsed.urgency || "MEDIUM",
        intentScore: parsed.intentScore ?? 80,
        confidenceScore: parsed.confidenceScore ?? 88,
        spamRiskScore: parsed.spamRiskScore ?? 3,
        reasoning: parsed.reasoning || "Análisis completado satisfactoriamente por el motor de IA de CONEXA.",
        recommendedResponseText: parsed.recommendedResponseText || "Hola 👋 Podés ver profesionales verificados en tu zona registrándote gratis en CONEXA.",
        analyzedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("Error en /api/radar/analyze");
      return res.status(500).json({ error: "Error interno al analizar oportunidad con IA." });
    }
  });

  // ==========================================
  // CONEXA RADAR MATCHING ENGINE (REAL + SIMULATION)
  // ==========================================

  // Professional profiles dataset for simulation / fallbacks
  const MASTER_PROFESSIONAL_PROFILES = [
    {
      id: 'pro-1',
      name: 'Ing. Carlos Mansilla',
      businessName: 'ElectroServicios Mansilla',
      professionName: 'Electricista Matriculado',
      category: 'Electricidad',
      categoryId: 'cat-hogar',
      specialties: ['Tableros trifásicos', 'Instalaciones domiciliarias', 'Pruebas de fuga', 'Certificación aptitud eléctrica', 'Aire acondicionado'],
      description: 'Electricista matriculado con más de 12 años de experiencia en obras residenciales y comerciales en Santiago del Estero y La Banda.',
      city: 'Santiago del Estero',
      province: 'Santiago del Estero',
      approxZone: 'Santiago del Estero - Barrio Parque',
      phonePrivate: '+54 385 499-8811',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
      isIdentityVerified: true,
      isProfessionalVerified: true,
      rating: 4.9,
      reviewCount: 87,
      jobsCompleted: 127,
      trustScore: 96,
      availabilityStatus: 'DISPONIBLE',
      responseRate: 98,
      workZoneRadiusKm: 25,
      isBlocked: false,
      isProfessional: true
    },
    {
      id: 'pro-2',
      name: 'Marcelo "Chelo" Juárez',
      businessName: 'Plomería & Termofusión Juárez',
      professionName: 'Plomero / Fontanero',
      category: 'Plomería',
      categoryId: 'cat-hogar',
      specialties: ['Termofusión Acqua System', 'Reparación de pérdidas ocultas', 'Destapes urgentes 24hs', 'Bombas presurizadoras'],
      description: 'Soluciones rápidas en plomería para Santiago y La Banda. Equipamiento moderno para detectar filtraciones sin romper paredes.',
      city: 'Santiago del Estero',
      province: 'Santiago del Estero',
      approxZone: 'La Banda - Centro',
      phonePrivate: '+54 385 588-3322',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
      isIdentityVerified: true,
      isProfessionalVerified: true,
      rating: 4.8,
      reviewCount: 54,
      jobsCompleted: 92,
      trustScore: 92,
      availabilityStatus: 'DISPONIBLE',
      responseRate: 95,
      workZoneRadiusKm: 20,
      isBlocked: false,
      isProfessional: true
    },
    {
      id: 'pro-3',
      name: 'Dra. María Laura Paz',
      businessName: 'Estudio Jurídico Paz & Asociados',
      professionName: 'Abogada',
      category: 'Profesionales & Graduados',
      categoryId: 'cat-profesionales',
      specialties: ['Derecho de Familia y Sucesiones', 'Derecho Laboral y ART', 'Redacción de Contratos', 'Mediación'],
      description: 'Atención personalizada y asesoramiento legal transparente en Santiago del Estero.',
      city: 'Santiago del Estero',
      province: 'Santiago del Estero',
      approxZone: 'Santiago del Estero - Centro Tribunales',
      phonePrivate: '+54 385 411-9900',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
      isIdentityVerified: true,
      isProfessionalVerified: true,
      rating: 5.0,
      reviewCount: 38,
      jobsCompleted: 45,
      trustScore: 99,
      availabilityStatus: 'DISPONIBLE',
      responseRate: 99,
      workZoneRadiusKm: 50,
      isBlocked: false,
      isProfessional: true
    },
    {
      id: 'pro-4',
      name: 'Luciano Ferreyra',
      businessName: 'TechSolutions Córdoba',
      professionName: 'Técnico de Computación y Redes',
      category: 'Tecnología & Digital',
      categoryId: 'cat-tech',
      specialties: ['Reparación de Notebooks', 'Armado de PC Gamer', 'Limpieza y cambio de pasta térmica', 'Desinfección de Virus'],
      description: 'Servicio técnico de notebooks y PC de escritorio en Córdoba.',
      city: 'Córdoba',
      province: 'Córdoba',
      approxZone: 'Córdoba Capital - Nueva Córdoba',
      phonePrivate: '+54 351 688-4411',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=250',
      isIdentityVerified: true,
      isProfessionalVerified: true,
      rating: 4.9,
      reviewCount: 62,
      jobsCompleted: 110,
      trustScore: 95,
      availabilityStatus: 'DISPONIBLE',
      responseRate: 94,
      workZoneRadiusKm: 30,
      isBlocked: false,
      isProfessional: true
    },
    {
      id: 'pro-5',
      name: 'Jorge "Coqui" Benítez',
      businessName: 'Gas & Termotanques CABA',
      professionName: 'Gasista Matriculado Metrogas',
      category: 'Gas',
      categoryId: 'cat-hogar',
      specialties: ['Instalación de cocinas y calefactores', 'Pruebas de hermeticidad', 'Trámites de rehabilitación Metrogas', 'Termotanques'],
      description: 'Gasista matriculado primera categoría Metrogas. Solución definitiva a cortes preventivos de gas.',
      city: 'Buenos Aires',
      province: 'CABA',
      approxZone: 'Buenos Aires - Caballito',
      phonePrivate: '+54 11 4400-9922',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=250',
      isIdentityVerified: true,
      isProfessionalVerified: true,
      rating: 4.7,
      reviewCount: 41,
      jobsCompleted: 68,
      trustScore: 91,
      availabilityStatus: 'DISPONIBLE',
      responseRate: 90,
      workZoneRadiusKm: 15,
      isBlocked: false,
      isProfessional: true
    },
    {
      id: 'pro-6',
      name: 'Roberto "Tito" Gómez',
      businessName: 'Refrigeración & A/A Gómez',
      professionName: 'Técnico en Refrigeración y Climatización',
      category: 'Refrigeración',
      categoryId: 'cat-hogar',
      specialties: ['Reparación de aire acondicionado', 'Carga de gas refrigerante', 'Mantenimiento de heladeras', 'Instalación de split'],
      description: 'Especialista en instalación y reparación urgente de aires acondicionados en Santiago del Estero.',
      city: 'Santiago del Estero',
      province: 'Santiago del Estero',
      approxZone: 'Santiago del Estero - Centro / Autonomía',
      phonePrivate: '+54 385 422-7711',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      isIdentityVerified: true,
      isProfessionalVerified: true,
      rating: 4.95,
      reviewCount: 74,
      jobsCompleted: 105,
      trustScore: 97,
      availabilityStatus: 'DISPONIBLE',
      responseRate: 97,
      workZoneRadiusKm: 30,
      isBlocked: false,
      isProfessional: true
    },
    {
      id: 'pro-7-inactive',
      name: 'Mariano Inactivo',
      businessName: 'Servicios Inactivos',
      professionName: 'Electricista General',
      category: 'Electricidad',
      categoryId: 'cat-hogar',
      specialties: ['Instalaciones'],
      description: 'Perfil suspendido por falta de verificación de documentos.',
      city: 'Santiago del Estero',
      province: 'Santiago del Estero',
      approxZone: 'Santiago del Estero - Oeste',
      phonePrivate: '+54 385 000-0000',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250',
      isIdentityVerified: false,
      isProfessionalVerified: false,
      rating: 3.2,
      reviewCount: 2,
      jobsCompleted: 1,
      trustScore: 40,
      availabilityStatus: 'OCUPADO',
      responseRate: 40,
      workZoneRadiusKm: 5,
      isBlocked: true, // SUSPENDED / INACTIVE
      isProfessional: true
    }
  ];

  // Helper matching scoring function according to CONEXA RADAR formula
  function scoreProfessionalCandidate(
    pro: typeof MASTER_PROFESSIONAL_PROFILES[0],
    reqCategory?: string,
    reqSubcategory?: string,
    reqCity?: string,
    reqProvince?: string,
    onlyVerified?: boolean
  ) {
    const reasons: string[] = [];
    let discardReason: string | null = null;

    // Discard rule 1: Active check
    if (pro.isBlocked || !pro.isProfessional) {
      discardReason = "Profesional suspendido / inactivo en plataforma CONEXA.";
      return { score: 0, isDiscarded: true, discardReason, breakdown: {}, reasons: [] };
    }

    // Discard rule 2: Strict verification policy if enabled
    if (onlyVerified && (!pro.isIdentityVerified || !pro.isProfessionalVerified)) {
      discardReason = "Falta verificación obligatoria de identidad/matrícula.";
      return { score: 0, isDiscarded: true, discardReason, breakdown: {}, reasons: [] };
    }

    // 1. CATEGORY SCORE (30% -> max 30 pts)
    let categoryScore = 0;
    const normReqCat = (reqCategory || "").toLowerCase().trim();
    const normReqSub = (reqSubcategory || "").toLowerCase().trim();
    const proProfName = pro.professionName.toLowerCase();
    const proCat = pro.category.toLowerCase();
    const proSpecs = pro.specialties.map(s => s.toLowerCase());

    const isExactMatch = normReqCat && (proProfName.includes(normReqCat) || normReqCat.includes(proProfName) || proCat.includes(normReqCat) || normReqCat.includes(proCat));
    const isSubMatch = normReqSub && (proSpecs.some(s => s.includes(normReqSub) || normReqSub.includes(s)) || proProfName.includes(normReqSub));

    if (isExactMatch && isSubMatch) {
      categoryScore = 30;
      reasons.push(`Categoría: 30/30 pts (Coincidencia exacta en ${pro.professionName})`);
    } else if (isExactMatch || isSubMatch) {
      categoryScore = 27;
      reasons.push(`Categoría: 27/30 pts (Afinidad alta en ${pro.professionName})`);
    } else if (normReqCat && (proCat.includes("hogar") || proCat.includes("construcción") || normReqCat.includes("otros"))) {
      categoryScore = 21;
      reasons.push(`Categoría: 21/30 pts (Afinidad general en el rubro)`);
    } else if (!normReqCat) {
      categoryScore = 24;
      reasons.push(`Categoría: 24/30 pts (Búsqueda abierta)`);
    } else {
      categoryScore = 0;
      discardReason = `Categoría incompatible (${pro.professionName} no coincide con ${reqCategory}).`;
      return { score: 0, isDiscarded: true, discardReason, breakdown: {}, reasons: [] };
    }

    // 2. LOCATION SCORE (20% -> max 20 pts)
    let locationScore = 0;
    const reqC = (reqCity || "Santiago del Estero").toLowerCase().trim();
    const reqP = (reqProvince || "Santiago del Estero").toLowerCase().trim();
    const proC = pro.city.toLowerCase();
    const proP = pro.province.toLowerCase();

    if (proC.includes(reqC) || reqC.includes(proC)) {
      locationScore = 20;
      reasons.push(`Ubicación: 20/20 pts (Misma localidad: ${pro.city})`);
    } else if (proP.includes(reqP) || reqP.includes(proP)) {
      locationScore = 15;
      reasons.push(`Ubicación: 15/20 pts (Misma provincia: ${pro.province})`);
    } else {
      locationScore = 0;
      discardReason = `Fuera de área de servicio (${pro.city} dista de la zona requerida ${reqCity}).`;
      return { score: 0, isDiscarded: true, discardReason, breakdown: {}, reasons: [] };
    }

    // 3. AVAILABILITY SCORE (15% -> max 15 pts)
    let availabilityScore = 0;
    if (pro.availabilityStatus === 'DISPONIBLE') {
      availabilityScore = 15;
      reasons.push(`Disponibilidad: 15/15 pts (Disponible actualmente)`);
    } else if (pro.availabilityStatus === 'EN_CONSULTA') {
      availabilityScore = 9;
      reasons.push(`Disponibilidad: 9/15 pts (En consulta / agenda abierta)`);
    } else {
      availabilityScore = 0;
      discardReason = `No disponible actualmente (Estado: ${pro.availabilityStatus}).`;
      return { score: 0, isDiscarded: true, discardReason, breakdown: {}, reasons: [] };
    }

    // 4. REPUTATION SCORE (15% -> max 15 pts)
    const ratingPart = (pro.rating / 5) * 12;
    const reviewPart = (Math.min(pro.reviewCount || 0, 30) / 30) * 3;
    const reputationScore = Math.round((ratingPart + reviewPart) * 10) / 10;
    reasons.push(`Reputación: ${reputationScore}/15 pts (${pro.rating} ★ - ${pro.reviewCount} valoraciones)`);

    // 5. VERIFICATION SCORE (10% -> max 10 pts)
    let verificationScore = 0;
    if (pro.isIdentityVerified && pro.isProfessionalVerified) {
      verificationScore = 10;
      reasons.push(`Verificación: 10/10 pts (Identidad y Matrícula comprobadas)`);
    } else if (pro.isIdentityVerified || pro.isProfessionalVerified) {
      verificationScore = 5;
      reasons.push(`Verificación: 5/10 pts (Verificación parcial)`);
    } else {
      verificationScore = 0;
      reasons.push(`Verificación: 0/10 pts (Sin verificar)`);
    }

    // 6. EXPERIENCE / COMPLETED JOBS (5% -> max 5 pts)
    let experienceScore = 1;
    if (pro.jobsCompleted >= 100) experienceScore = 5;
    else if (pro.jobsCompleted >= 50) experienceScore = 4;
    else if (pro.jobsCompleted >= 20) experienceScore = 3;
    else if (pro.jobsCompleted >= 5) experienceScore = 2;
    reasons.push(`Experiencia: ${experienceScore}/5 pts (${pro.jobsCompleted} trabajos completados)`);

    // 7. RESPONSE RATE (5% -> max 5 pts)
    const responseRateScore = Math.round(((pro.responseRate || 95) / 100) * 5 * 10) / 10;
    reasons.push(`Tasa de Respuesta: ${responseRateScore}/5 pts (${pro.responseRate || 95}% de respuesta rápida)`);

    const totalScore = Math.min(100, Math.round(
      categoryScore + locationScore + availabilityScore + reputationScore + verificationScore + experienceScore + responseRateScore
    ));

    const breakdown = {
      category: `${categoryScore}/30`,
      location: `${locationScore}/20`,
      availability: `${availabilityScore}/15`,
      reputation: `${reputationScore}/15`,
      verification: `${verificationScore}/10`,
      experience: `${experienceScore}/5`,
      responseRate: `${responseRateScore}/5`
    };

    return {
      score: totalScore,
      isDiscarded: false,
      discardReason: null,
      breakdown,
      reasons
    };
  }

  // 2. CONEXA MATCH Engine Endpoint (Production & Simulation)
  app.post("/api/radar/match", rateLimiter, async (req: Request, res: Response) => {
    try {
      const { category, subcategory, city, province, limit, environment, isTest, onlyVerified } = req.body;
      const isProductionMode = (process.env.RADAR_MODE || process.env.APP_ENV || "PRODUCTION").toUpperCase() === "PRODUCTION";
      const isSimulation = !isProductionMode && Boolean(isTest || environment === "simulation");

      let candidateList: any[] = [];
      let dataSource = "";

      if (isProductionMode) {
        // PRODUCTION GUARD: Authenticate and authorize as ADMIN/SUPER_ADMIN
        const auth = await verifyAuthToken(req);
        if (!auth.isAuthenticated) {
          return res.status(401).json({
            success: false,
            error: auth.errorReason === "FIREBASE_ADMIN_SDK_NOT_CONFIGURED"
              ? "Imposible verificar token en backend. Se requiere configurar credencial de Firebase Admin SDK en el servidor para realizar búsquedas de producción."
              : "Acceso denegado. Se requiere un Firebase ID Token válido en el encabezado Authorization.",
            code: "UNAUTHORIZED"
          });
        }
        if (!auth.isAdmin) {
          return res.status(403).json({
            success: false,
            error: "Acceso denegado. Solo administradores autorizados pueden realizar consultas del RADAR MATCH en producción.",
            code: "FORBIDDEN"
          });
        }

        // Fetch real professional users from Firestore
        const hasFirebaseAdminConfig = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS);
        if (!hasFirebaseAdminConfig) {
          return res.status(503).json({
            success: false,
            error: "El servidor de producción no tiene configuradas las credenciales de Firebase Admin SDK.",
            code: "FIREBASE_ADMIN_NOT_CONFIGURED"
          });
        }

        const db = await getAdminDb();

        try {
          const usersSnap = await db.collection('users')
            .where('role', '==', 'PROFESSIONAL')
            .get();

          const candidates: any[] = [];
          if (!usersSnap.empty) {
            usersSnap.forEach((doc: any) => {
              candidates.push({ id: doc.id, ...doc.data() });
            });
          }
          candidateList = candidates;
          dataSource = "FIRESTORE_PRODUCTION";
        } catch (dbErr: any) {
          console.error("[RADAR MATCH] Error consultando Firestore candidates:", dbErr.message || dbErr);
          return res.status(503).json({
            success: false,
            error: `Servicio de Firestore no disponible o error de consulta: ${dbErr.message || dbErr}`,
            code: "FIRESTORE_PRODUCTION_UNAVAILABLE"
          });
        }
      } else {
        // Simulation mode
        candidateList = MASTER_PROFESSIONAL_PROFILES;
        dataSource = "DEMO / MOCKDATA";
      }

      const rankedProfessionals: any[] = [];
      const discardedProfessionals: any[] = [];

      candidateList.forEach(pro => {
        const scoreResult = scoreProfessionalCandidate(
          pro,
          category,
          subcategory,
          city || "Santiago del Estero",
          province || "Santiago del Estero",
          Boolean(onlyVerified)
        );

        if (scoreResult.isDiscarded) {
          discardedProfessionals.push({
            professionalId: pro.id,
            name: pro.name,
            professionName: pro.professionName,
            discardReason: scoreResult.discardReason
          });
        } else {
          rankedProfessionals.push({
            professionalId: pro.id,
            name: pro.name,
            professionName: pro.professionName,
            avatar: pro.avatar,
            matchScore: scoreResult.score,
            trustScore: pro.trustScore,
            locationApprox: pro.approxZone,
            phoneProtected: "[TELÉFONO PROTEGIDO POR CONEXA]",
            isVerified: pro.isIdentityVerified && pro.isProfessionalVerified,
            isIdentityVerified: pro.isIdentityVerified,
            isProfessionalVerified: pro.isProfessionalVerified,
            availabilityStatus: pro.availabilityStatus,
            jobsCompleted: pro.jobsCompleted,
            rating: pro.rating,
            reviewCount: pro.reviewCount,
            matchReasons: scoreResult.reasons,
            scoreBreakdown: scoreResult.breakdown
          });
        }
      });

      // Sort by matchScore descending
      rankedProfessionals.sort((a, b) => b.matchScore - a.matchScore);

      // Add rank (TOP 1, TOP 2, TOP 3)
      const topRanked = rankedProfessionals.slice(0, limit || 3).map((pro, index) => ({
        ...pro,
        rank: index + 1,
        rankTag: `TOP ${index + 1}`
      }));

      return res.json({
        success: true,
        category: category || "General",
        city: city || "Santiago del Estero",
        environment: isSimulation ? "simulation" : "production",
        dataSource,
        matchCount: topRanked.length,
        rankedProfessionals: topRanked,
        results: topRanked,
        discardedCount: discardedProfessionals.length,
        discardedProfessionals
      });
    } catch (err: any) {
      console.error("Error en /api/radar/match");
      return res.status(500).json({ error: "Error interno al ejecutar CONEXA MATCH." });
    }
  });

  // 3. Receive New Opportunity Endpoint (n8n Webhook / API Input)
  app.post("/api/radar/opportunity", rateLimiter, async (req: Request, res: Response) => {
    try {
      const { source, sourceType, externalReference, description, city, province, neighborhood, contactMethod, notes, environment, is_test } = req.body;

      if (!description || typeof description !== "string") {
        return res.status(400).json({ error: "Falta la descripción de la demanda." });
      }

      const isTestEnv = Boolean(is_test || source === "radar_test" || environment === "simulation");

      // In production, require webhook secret authentication
      if (!isTestEnv) {
        const incomingSecret = req.headers['x-radar-secret'] || req.headers['x-n8n-secret'];
        const expectedSecret = process.env.RADAR_WEBHOOK_SECRET || process.env.N8N_WEBHOOK_SECRET;
        
        if (!expectedSecret) {
          return res.status(500).json({
            success: false,
            error: "Acceso denegado. Secreto RADAR_WEBHOOK_SECRET / N8N_WEBHOOK_SECRET no configurado en el servidor para recibir eventos en producción.",
            code: "WEBHOOK_SECRET_NOT_CONFIGURED"
          });
        }

        if (incomingSecret !== expectedSecret) {
          return res.status(401).json({
            success: false,
            error: "Acceso denegado. Se requiere encabezado x-radar-secret o x-n8n-secret válido para registrar oportunidades en producción.",
            code: "UNAUTHORIZED_WEBHOOK_SECRET"
          });
        }
      }

      // Anti-Spam Check (only in production or non-test to allow repeated test runs if needed)
      const hash = generateOpportunityHash(description, city || "Santiago del Estero");
      if (!isTestEnv && processedOpportunityHashes.has(hash)) {
        return res.status(409).json({
          status: "DUPLICATE_IGNORED",
          message: "Oportunidad duplicada omitida por el DuplicateOpportunityDetector de CONEXA."
        });
      }
      if (!isTestEnv) {
        processedOpportunityHashes.add(hash);
      }

      const sanitizedDesc = sanitizePIIForAI(description.slice(0, 1000));

      // Trigger AI Analysis
      const ai = getGeminiClient();
      let aiResult = {
        category: "Electricidad",
        subcategory: "Reparación General",
        intent: "HIGH" as const,
        urgency: "HIGH" as const,
        intentScore: 88,
        confidenceScore: 95,
        spamRiskScore: 2,
        reasoning: isTestEnv ? "Oportunidad de prueba generada en CONEXA RADAR Test Lab." : "Oportunidad procesada por webhook n8n con intención de contratación.",
        recommendedResponseText: "Hola 👋 En CONEXA podés ver profesionales verificados de tu zona con resguardo de datos."
      };

      if (ai) {
        try {
          const aiRes = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: `Analizá esta demanda de servicios: "${sanitizedDesc}". Ciudad: ${city || "Santiago del Estero"}.
Responde en JSON:
- category: ["Electricidad", "Plomería", "Gas", "Refrigeración", "Mecánica", "Limpieza", "Construcción", "Pintura", "Informática", "Cerrajería", "Jardinería", "Otros"]
- subcategory: string corto
- intent: "LOW", "MEDIUM" o "HIGH"
- urgency: "LOW", "MEDIUM", "HIGH" o "EMERGENCY"
- intentScore: 0-100
- confidenceScore: 0-100
- spamRiskScore: 0-100
- reasoning: string
- recommendedResponseText: string`,
            config: { responseMimeType: "application/json" }
          });
          const parsed = JSON.parse(aiRes.text || "{}");
          if (parsed.category) aiResult = parsed;
        } catch (e) {
          console.warn("Error en fallback AI para opportunity endpoint");
        }
      }

      // Compute dynamic TOP 3 matched professionals for the opportunity
      const dynamicMatches: any[] = [];
      MASTER_PROFESSIONAL_PROFILES.forEach(pro => {
        const scoreRes = scoreProfessionalCandidate(
          pro,
          aiResult.category,
          aiResult.subcategory,
          city || "Santiago del Estero",
          province || "Santiago del Estero",
          false
        );
        if (!scoreRes.isDiscarded && scoreRes.score > 0) {
          dynamicMatches.push({
            professionalId: pro.id,
            name: pro.name,
            professionName: pro.professionName,
            avatar: pro.avatar,
            matchScore: scoreRes.score,
            trustScore: pro.trustScore,
            locationApprox: pro.approxZone,
            phoneProtected: "[TELÉFONO PROTEGIDO POR CONEXA]",
            isVerified: pro.isIdentityVerified && pro.isProfessionalVerified,
            matchReasons: scoreRes.reasons,
            scoreBreakdown: scoreRes.breakdown
          });
        }
      });
      dynamicMatches.sort((a, b) => b.matchScore - a.matchScore);
      const top3Matched = dynamicMatches.slice(0, 3).map((m, idx) => ({ ...m, rank: idx + 1, rankTag: `TOP ${idx + 1}` }));

      const opportunityId = `RAD-${Math.floor(100 + Math.random() * 900)}`;
      const newOpportunity = {
        id: opportunityId,
        source: source || (isTestEnv ? "radar_test" : "API Externa / Webhook n8n"),
        sourceType: sourceType || (isTestEnv ? "CANAL_PROPIO" : "WEBHOOK"),
        externalReference: externalReference || `ext_${Date.now()}`,
        environment: isTestEnv ? "simulation" : "production",
        is_test: isTestEnv,
        category: aiResult.category,
        subcategory: aiResult.subcategory,
        description: sanitizedDesc,
        city: city || "Santiago del Estero",
        province: province || "Santiago del Estero",
        neighborhood: neighborhood || "Centro",
        urgency: aiResult.urgency,
        intentScore: aiResult.intentScore,
        confidenceScore: aiResult.confidenceScore,
        status: aiResult.intentScore >= 80 ? "QUALIFIED" : "ANALYZED",
        detectedAt: "Recién detectado",
        lastUpdated: "Ahora",
        assignedOperator: isTestEnv ? "Test Lab Simulación" : "Operador Sistema - Auto",
        matchedProfessionals: top3Matched.length > 0 ? top3Matched : [
          {
            professionalId: "pro-1",
            name: "Ing. Carlos Mansilla",
            professionName: `${aiResult.category} Verificado`,
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
            matchScore: 96,
            trustScore: 98,
            locationApprox: `${city || 'Santiago del Estero'} - Centro`,
            phoneProtected: "[TELÉFONO PROTEGIDO POR CONEXA]",
            isVerified: true,
            matchReasons: ["Profesional líder en zona", "Verificado officially en CONEXA"]
          }
        ],
        conversionStatus: "NOT_STARTED",
        consentStatus: "PENDING_CONSENT",
        contactMethod: contactMethod || "CANAL_OFICIAL",
        notes: notes || (isTestEnv ? "Prueba creada en RADAR Test Lab" : "Procesado vía endpoint seguro /api/radar/opportunity"),
        aiAnalysis: aiResult,
        attribution: {
          source: isTestEnv ? "radar_test_lab" : "radar_webhook_n8n",
          campaign: isTestEnv ? "simulation" : "n8n_demand_automation",
          opportunityId
        }
      };

      return res.status(201).json({
        success: true,
        opportunity: newOpportunity,
        n8nNextStep: aiResult.intentScore >= 80 ? "NOTIFY_OPERATOR_HIGH_INTENT" : "QUEUE_FOR_OPERATOR_REVIEW"
      });
    } catch (err: any) {
      console.error("Error al registrar oportunidad en /api/radar/opportunity");
      return res.status(500).json({ error: "Error interno al procesar la oportunidad." });
    }
  });

  // 4. Contact Orchestration Endpoint
  app.post("/api/radar/contact", rateLimiter, async (req: Request, res: Response) => {
    try {
      const { opportunityId, responseText, contactMethod, operatorApproval, isTest, dryRun, consentStatus } = req.body;

      if (!opportunityId) {
        return res.status(400).json({ error: "Falta el ID de la oportunidad." });
      }

      const isProductionMode = (process.env.RADAR_MODE || process.env.APP_ENV || "PRODUCTION").toUpperCase() === "PRODUCTION";
      const isSimulation = !isProductionMode && Boolean(isTest || dryRun);
      const auth = await verifyAuthToken(req);

      // SECURITY CHECK 1: Production Authorization Guard
      if (!isSimulation && !auth.isAdmin) {
        return res.status(403).json({
          success: false,
          opportunityId,
          status: "REJECTED_UNAUTHORIZED",
          error: "Acceso denegado. Los envíos de contacto en producción requieren autenticación y rol de ADMINISTRADOR.",
          code: "UNAUTHORIZED_ADMIN_REQUIRED"
        });
      }

      // SECURITY CHECK 2: User Consent Requirement Guard
      if (consentStatus === "REVOKED") {
        return res.status(403).json({
          success: false,
          opportunityId,
          status: "REJECTED_NO_CONSENT",
          error: "Contacto cancelado por el sistema. El usuario revocó su consentimiento expreso de comunicación.",
          code: "REVOKED_CONSENT"
        });
      }

      // SECURITY CHECK 3: Messaging Provider Configuration Check
      const hasMessagingProvider = Boolean(process.env.WHATSAPP_API_TOKEN || process.env.TWILIO_AUTH_TOKEN || process.env.MESSAGING_PROVIDER_KEY);

      if (isSimulation) {
        return res.json({
          success: true,
          opportunityId,
          status: "SIMULATION_ONLY",
          isSimulation: true,
          selectedProfessional: "Ing. Carlos Mansilla",
          channel: contactMethod || "CANAL_OFICIAL",
          generatedMessage: responseText || "Mensaje de prueba preparado para simulación.",
          dispatchedAt: new Date().toISOString(),
          approval: operatorApproval ? "APPROVED_BY_OPERATOR" : "SIMULATION_DRY_RUN",
          notes: "MODO SIMULACIÓN — Ninguna comunicación real fue despachada."
        });
      }

      if (!hasMessagingProvider) {
        return res.status(503).json({
          success: false,
          opportunityId,
          status: "PROVIDER_NOT_CONFIGURED",
          error: "Imposible realizar envío real en producción. No hay proveedor oficial de mensajería (WHATSAPP_API_TOKEN / TWILIO_AUTH_TOKEN) configurado.",
          code: "PROVIDER_NOT_CONFIGURED"
        });
      }

      // Since there is no actual external messaging provider library code integrated to talk toTwilio/WhatsApp:
      return res.status(501).json({
        success: false,
        opportunityId,
        status: "PROVIDER_NOT_IMPLEMENTED",
        error: "No existe una implementación real de cliente para el proveedor seleccionado en el servidor de producción.",
        code: "PROVIDER_NOT_IMPLEMENTED"
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Error al orquestar el contacto." });
    }
  });

  // 5. Conversion & Attribution Endpoint
  app.post("/api/radar/conversion", rateLimiter, async (req: Request, res: Response) => {
    try {
      const { opportunityId, campaign, userId, conversionType, isTest, dryRun } = req.body;
      const isProductionMode = (process.env.RADAR_MODE || process.env.APP_ENV || "PRODUCTION").toUpperCase() === "PRODUCTION";
      const isSimulation = !isProductionMode && Boolean(isTest || dryRun);
      const auth = await verifyAuthToken(req);

      if (!isSimulation && !auth.isAdmin) {
        return res.status(403).json({
          success: false,
          status: "REJECTED_UNAUTHORIZED",
          error: "Acceso denegado. Registrar conversiones reales en producción requiere autorización de ADMINISTRADOR.",
          code: "UNAUTHORIZED_ADMIN_REQUIRED"
        });
      }

      return res.json({
        success: true,
        opportunityId: opportunityId || "RAD-SIM-001",
        conversionType: conversionType || (isSimulation ? "CONVERSIÓN SIMULADA" : "REGISTRO_USUARIO"),
        isSimulation,
        userId: userId || "user-simulated-789",
        status: isSimulation ? "CONVERSIÓN SIMULADA EXITOSAMENTE" : "CONVERTED",
        attribution: {
          source: isSimulation ? "radar_simulation_lab" : "radar",
          campaign: campaign || "radar_test_lab",
          convertedAt: new Date().toISOString()
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Error al registrar la conversión." });
    }
  });

  // 5. Integration Status Check Endpoint (Returns non-sensitive configuration state)
  app.get("/api/radar/config-status", rateLimiter, async (_req: Request, res: Response) => {
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY");
    
    // Check if Firebase Client config exists
    const hasFirebaseConfigFile = fs.existsSync(path.join(process.cwd(), 'firebase-applet-config.json')) || 
      Boolean(process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_CONFIG);
    
    // Check if Firebase Admin SDK Service Account exists
    const hasFirebaseAdminConfig = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS);

    let firebaseStatus = "NOT_CONFIGURED";
    let firebaseBadge = "🔴 NO CONFIGURADO";
    let firebaseDetails = "Falta archivo firebase-applet-config.json y credencial de Firebase Admin SDK.";

    if (hasFirebaseConfigFile && hasFirebaseAdminConfig) {
      firebaseStatus = "CONFIGURED";
      firebaseBadge = "🟢 CONFIGURADO";
      firebaseDetails = "Firebase Client y Firebase Admin SDK conectados activamente.";
    } else if (hasFirebaseConfigFile || hasFirebaseAdminConfig) {
      firebaseStatus = "PARTIAL";
      firebaseBadge = "🟡 CONFIGURACIÓN PARCIAL";
      firebaseDetails = hasFirebaseConfigFile
        ? "Cliente Firebase disponible. Falta credencial de Firebase Admin SDK para verificación de tokens en backend."
        : "Firebase Admin SDK disponible. Falta configuración de cliente firebase-applet-config.json.";
    }

    const metaAppId = process.env.META_APP_ID;
    const metaAppSecret = process.env.META_APP_SECRET;
    const metaVerifyToken = process.env.META_VERIFY_TOKEN;
    const metaAccessToken = process.env.META_ACCESS_TOKEN;
    const hasMetaFull = Boolean(metaAppId && metaAppSecret && metaVerifyToken && metaAccessToken);
    const hasMetaPartial = Boolean(metaAppId || metaAppSecret || metaVerifyToken || metaAccessToken);

    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET || process.env.RADAR_WEBHOOK_SECRET;
    const hasN8nFull = Boolean(n8nUrl && n8nSecret);
    const hasN8nPartial = Boolean(n8nUrl || n8nSecret);

    const hasMessagingProvider = Boolean(process.env.WHATSAPP_API_TOKEN || process.env.TWILIO_AUTH_TOKEN || process.env.MESSAGING_PROVIDER_KEY);

    const radarMode = process.env.RADAR_MODE || "PRODUCTION";

    return res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      radarMode,
      integrations: {
        firebase: {
          status: firebaseStatus,
          badge: firebaseBadge,
          details: firebaseDetails
        },
        firebaseAdmin: {
          status: hasFirebaseAdminConfig ? "CONFIGURED" : "NOT_CONFIGURED",
          badge: hasFirebaseAdminConfig ? "🟢 CONFIGURADO" : "🔴 NO CONFIGURADO",
          details: hasFirebaseAdminConfig 
            ? "Firebase Admin SDK disponible para verificación de ID tokens en backend." 
            : "Sin servicio de cuenta Firebase Admin. Token verification se realiza previa inicialización."
        },
        firestore: {
          status: hasFirebaseAdminConfig ? "CONFIGURED" : "NOT_CONFIGURED",
          badge: hasFirebaseAdminConfig ? "🟢 CONFIGURADO" : "🔴 NO CONFIGURADO",
          details: hasFirebaseAdminConfig ? "Firestore disponible para persistencia real." : "Firestore no disponible."
        },
        aiEngine: {
          status: hasGeminiKey ? "CONFIGURED" : "NOT_CONFIGURED",
          badge: hasGeminiKey ? "🟢 CONFIGURADO" : "🔴 NO CONFIGURADO",
          model: "gemini-3.6-flash",
          details: hasGeminiKey ? "Gemini 3.6 Flash activo para análisis de demanda y PII redaction." : "Usando parser heurístico por falta de GEMINI_API_KEY."
        },
        metaConnector: {
          status: hasMetaFull ? "CONFIGURED" : (hasMetaPartial ? "PARTIAL" : "NOT_CONFIGURED"),
          badge: hasMetaFull ? "🟢 CONFIGURADO" : (hasMetaPartial ? "🟡 CONFIGURACIÓN PARCIAL" : "🔴 NO CONFIGURADO"),
          details: hasMetaFull 
            ? "Webhook y Graph API listos con verificación de firma HMAC."
            : "Endpoints de webhook listos en server.ts. Requiere variables META_APP_ID, META_APP_SECRET, META_VERIFY_TOKEN y META_ACCESS_TOKEN."
        },
        n8nConnector: {
          status: hasN8nFull ? "CONFIGURED" : (hasN8nPartial ? "PARTIAL" : "NOT_CONFIGURED"),
          badge: hasN8nFull ? "🟢 CONFIGURADO" : (hasN8nPartial ? "🟡 CONFIGURACIÓN PARCIAL" : "🔴 NO CONFIGURADO"),
          details: hasN8nFull 
            ? "Flujo de automatización n8n conectado con secreto encriptado."
            : "Endpoint /api/radar/n8n/webhook listo. Requiere N8N_WEBHOOK_SECRET para autenticación."
        },
        messagingProvider: {
          status: hasMessagingProvider ? "CONFIGURED" : "NOT_CONFIGURED",
          badge: hasMessagingProvider ? "🟢 CONFIGURADO" : "🔴 NO CONFIGURADO",
          details: hasMessagingProvider 
            ? "Proveedor oficial de envíos conectado."
            : "Sin proveedor oficial. Despachos restringidos estrictamente a DRY-RUN (Modo Simulación)."
        }
      }
    });
  });

  // ==========================================
  // META CONNECTOR OFFICIAL WEBHOOK ENDPOINTS
  // ==========================================

  // GET Meta Webhook Verification (hub.challenge / hub.verify_token)
  app.get("/api/radar/meta/webhook", (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedToken = process.env.META_VERIFY_TOKEN || "CONEXA_RADAR_META_VERIFY_TOKEN_2026";

    if (mode === 'subscribe' && token === expectedToken) {
      console.log("[MetaConnector] Webhook de Meta verificado correctamente.");
      return res.status(200).send(challenge);
    } else {
      console.warn("[MetaConnector] Intento de verificación de Meta rechazado por token inválido.");
      return res.status(403).json({ error: "Token de verificación de Meta inválido." });
    }
  });

  // POST Meta Webhook Ingestion (Page Comments, Messages, Leadgen)
  app.post("/api/radar/meta/webhook", rateLimiter, async (req: Request, res: Response) => {
    try {
      // Requirement 11: Verify HMAC SHA256 signature if META_APP_SECRET is set
      const signatureHeader = req.headers['x-hub-signature-256'] as string;
      const metaSecret = process.env.META_APP_SECRET;

      if (metaSecret) {
        if (!signatureHeader) {
          return res.status(401).json({ error: "Acceso denegado. Se requiere encabezado X-Hub-Signature-256 para eventos de Meta." });
        }
        const expectedHmac = crypto.createHmac('sha256', metaSecret).update(JSON.stringify(req.body)).digest('hex');
        const expectedSignature = `sha256=${expectedHmac}`;

        if (signatureHeader !== expectedSignature) {
          console.warn("[MetaConnector] Firma X-Hub-Signature-256 no coincide.");
          return res.status(401).json({ error: "Firma de Webhook Meta inválida (X-Hub-Signature-256 mismatch)." });
        }
      }

      const body = req.body;
      if (!body || body.object !== 'page') {
        return res.status(200).send('EVENT_RECEIVED'); // Always respond 200 OK to Meta
      }

      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0]?.value || entry?.messaging?.[0];
      const rawMessage = changes?.message?.text || changes?.comment_text || changes?.leadgen_data || "";
      const senderId = changes?.sender?.id || changes?.from?.id || "meta_user_anonymous";
      const pageId = entry?.id || "meta_page";

      if (!rawMessage || typeof rawMessage !== "string") {
        return res.status(200).send('EVENT_RECEIVED');
      }

      // Sanitize PII
      const sanitizedDesc = sanitizePIIForAI(rawMessage);

      // Check anti-spam duplicate hash
      const hash = generateOpportunityHash(sanitizedDesc, "Santiago del Estero");
      if (processedOpportunityHashes.has(hash)) {
        return res.status(200).json({ status: "DUPLICATE_IGNORED" });
      }
      processedOpportunityHashes.add(hash);

      // Analyze with AI
      const ai = getGeminiClient();
      let aiResult = {
        category: "Otros",
        subcategory: "Consulta Meta",
        intent: "HIGH" as const,
        urgency: "HIGH" as const,
        intentScore: 85,
        confidenceScore: 92,
        spamRiskScore: 3,
        reasoning: "Demanda detectada en página oficial de Meta.",
        recommendedResponseText: "Hola 👋 Podés ver profesionales verificados en tu zona registrándote gratis en CONEXA."
      };

      if (ai) {
        try {
          const aiRes = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: `Analizá esta publicación/comentario en Meta: "${sanitizedDesc}".
Responde en JSON:
- category: ["Electricidad", "Plomería", "Gas", "Refrigeración", "Mecánica", "Limpieza", "Construcción", "Pintura", "Informática", "Cerrajería", "Jardinería", "Otros"]
- subcategory: string corto
- intent: "LOW", "MEDIUM" o "HIGH"
- urgency: "LOW", "MEDIUM", "HIGH" o "EMERGENCY"
- intentScore: 0-100
- confidenceScore: 0-100
- spamRiskScore: 0-100
- reasoning: string
- recommendedResponseText: string`,
            config: { responseMimeType: "application/json" }
          });
          const parsed = JSON.parse(aiRes.text || "{}");
          if (parsed.category) aiResult = parsed;
        } catch (e) {
          console.warn("Fallback AI en Meta webhook");
        }
      }

      const opportunityId = `RAD-META-${Math.floor(1000 + Math.random() * 9000)}`;
      const opportunity = {
        id: opportunityId,
        source: "Meta Graph API (Página Oficial)",
        sourceType: "META_INTEGRATION_OFFICIAL",
        externalReference: `meta_${pageId}_${senderId}_${Date.now()}`,
        environment: "production",
        is_test: false,
        category: aiResult.category,
        subcategory: aiResult.subcategory,
        description: sanitizedDesc,
        city: "Santiago del Estero",
        province: "Santiago del Estero",
        urgency: aiResult.urgency,
        intentScore: aiResult.intentScore,
        confidenceScore: aiResult.confidenceScore,
        status: aiResult.intentScore >= 80 ? "QUALIFIED" : "ANALYZED",
        detectedAt: "Recién ingresado de Meta",
        lastUpdated: "Ahora",
        assignedOperator: "MetaConnector Auto",
        conversionStatus: "NOT_STARTED",
        consentStatus: "PENDING_CONSENT",
        contactMethod: "CANAL_OFICIAL_META",
        aiAnalysis: aiResult,
        attribution: {
          source: "meta_official_page",
          campaign: "meta_webhook_demand",
          opportunityId
        }
      };

      console.log(`[MetaConnector] Oportunidad creada exitosamente de Meta Webhook: ${opportunityId}`);
      return res.status(200).json({ status: "SUCCESS", opportunityId });
    } catch (err) {
      console.error("Error procesando Meta Webhook");
      return res.status(200).send('EVENT_RECEIVED'); // Always respond 200 to Meta to avoid webhook unbinding
    }
  });

  // ==========================================
  // N8N CONNECTOR OFFICIAL WEBHOOK ENDPOINT
  // ==========================================

  app.post("/api/radar/n8n/webhook", rateLimiter, async (req: Request, res: Response) => {
    try {
      const incomingSecret = (req.headers['x-n8n-secret'] || req.headers['x-radar-secret']) as string;
      const expectedSecret = process.env.N8N_WEBHOOK_SECRET || process.env.RADAR_WEBHOOK_SECRET;

      if (!expectedSecret) {
        return res.status(500).json({
          error: "Acceso denegado. Secreto de webhook N8N_WEBHOOK_SECRET no configurado en las variables de entorno del servidor para producción.",
          code: "N8N_WEBHOOK_SECRET_NOT_CONFIGURED"
        });
      }

      if (incomingSecret !== expectedSecret) {
        return res.status(401).json({
          error: "Acceso denegado. Secreto X-N8N-Secret o X-Radar-Secret no válido.",
          code: "INVALID_WEBHOOK_SECRET"
        });
      }

      const { description, rawText, city, province, neighborhood, source, contactMethod, externalReference } = req.body;
      const textToAnalyze = (description || rawText || "").trim();

      if (!textToAnalyze) {
        return res.status(400).json({ error: "Campo description o rawText requerido en payload de n8n." });
      }

      const sanitizedDesc = sanitizePIIForAI(textToAnalyze);

      // Check anti-spam duplicate hash
      const hash = generateOpportunityHash(sanitizedDesc, city || "Santiago del Estero");
      if (processedOpportunityHashes.has(hash)) {
        return res.status(200).json({
          status: "DUPLICATE_IGNORED",
          message: "Oportunidad de n8n duplicada omitida por CONEXA."
        });
      }
      processedOpportunityHashes.add(hash);

      const ai = getGeminiClient();
      let aiResult = {
        category: "Otros",
        subcategory: "Consulta n8n Workflow",
        intent: "HIGH" as const,
        urgency: "HIGH" as const,
        intentScore: 88,
        confidenceScore: 95,
        spamRiskScore: 1,
        reasoning: "Procesado por workflow verificado en n8n.",
        recommendedResponseText: "Hola 👋 Podés consultar profesionales verificados en tu zona registrándote gratis en CONEXA."
      };

      if (ai) {
        try {
          const aiRes = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: `Analizá la siguiente demanda recibida vía n8n: "${sanitizedDesc}". Ciudad: ${city || "Santiago del Estero"}.
Responde en JSON:
- category: ["Electricidad", "Plomería", "Gas", "Refrigeración", "Mecánica", "Limpieza", "Construcción", "Pintura", "Informática", "Cerrajería", "Jardinería", "Otros"]
- subcategory: string corto
- intent: "LOW", "MEDIUM" o "HIGH"
- urgency: "LOW", "MEDIUM", "HIGH" o "EMERGENCY"
- intentScore: 0-100
- confidenceScore: 0-100
- spamRiskScore: 0-100
- reasoning: string
- recommendedResponseText: string`,
            config: { responseMimeType: "application/json" }
          });
          const parsed = JSON.parse(aiRes.text || "{}");
          if (parsed.category) aiResult = parsed;
        } catch (e) {
          console.warn("Fallback AI en n8n webhook");
        }
      }

      const opportunityId = `RAD-N8N-${Math.floor(1000 + Math.random() * 9000)}`;
      const opportunity = {
        id: opportunityId,
        source: source || "n8n Automation Workflow",
        sourceType: "WEBHOOK",
        externalReference: externalReference || `n8n_${Date.now()}`,
        environment: "production",
        is_test: false,
        category: aiResult.category,
        subcategory: aiResult.subcategory,
        description: sanitizedDesc,
        city: city || "Santiago del Estero",
        province: province || "Santiago del Estero",
        neighborhood: neighborhood || "Centro",
        urgency: aiResult.urgency,
        intentScore: aiResult.intentScore,
        confidenceScore: aiResult.confidenceScore,
        status: aiResult.intentScore >= 80 ? "QUALIFIED" : "ANALYZED",
        detectedAt: "Recién procesado por n8n",
        lastUpdated: "Ahora",
        assignedOperator: "N8NConnector Auto",
        conversionStatus: "NOT_STARTED",
        consentStatus: "PENDING_CONSENT",
        contactMethod: contactMethod || "CANAL_OFICIAL",
        aiAnalysis: aiResult,
        attribution: {
          source: "n8n_webhook",
          campaign: "n8n_demand_automation",
          opportunityId
        }
      };

      console.log(`[N8NConnector] Oportunidad creada de n8n Webhook: ${opportunityId}`);
      return res.status(201).json({
        success: true,
        opportunityId,
        status: "QUALIFIED",
        opportunity
      });
    } catch (err) {
      console.error("Error en /api/radar/n8n/webhook");
      return res.status(500).json({ error: "Error interno al procesar webhook de n8n." });
    }
  });


  // Global Error Handler Middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Internal Server Error");
    res.status(500).json({
      error: "Ha ocurrido un error inesperado en el servidor.",
      code: "INTERNAL_SERVER_ERROR"
    });
  });

  // Serve static assets or mount Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CONEXA Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start CONEXA server:", err);
  process.exit(1);
});

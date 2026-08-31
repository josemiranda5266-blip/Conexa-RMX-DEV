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
import { buildMercadoPagoAuthorizationUrl, createOAuthConnection, exchangeMercadoPagoCode, verifyOAuthState } from "./src/server/payments/mercadoPagoOAuth.js";
import { consumeOAuthState, reserveOAuthState, saveOAuthConnection } from "./src/server/payments/mercadoPagoOAuthPersistence.js";

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

  const envValidation = validateMercadoPagoEnv();
  if (!envValidation.isValid) {
    console.warn("\n⚠️ [Mercado Pago Config Warning] Se detectaron variables de entorno faltantes o con formato inválido:");
    envValidation.errors.forEach((err) => console.warn(`   ${err}`));
    console.warn("   Para habilitar pagos de Mercado Pago, configure las variables correspondientes.\n");
    if (process.env.STRICT_ENV_CHECK === "true") validateMercadoPagoEnv({ throwOnError: true });
  } else {
    console.log("✅ [Mercado Pago Config] Todas las variables de entorno requeridas están configuradas y verificadas con éxito.");
  }

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { (req as any).rawBody = Buffer.from(buf); } }));

  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for'] as string || '127.0.0.1';
    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxRequests = 30;
    const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };
    if (now > record.resetTime) { record.count = 1; record.resetTime = now + windowMs; }
    else record.count++;
    rateLimitMap.set(ip, record);
    if (record.count > maxRequests) return res.status(429).json({ error: "Límite de solicitudes excedido (Rate Limit). Intente nuevamente en un minuto.", status: "RATE_LIMITED" });
    next();
  };

  // Mercado Pago OAuth: merchant identity comes only from the authenticated Firebase user.
  app.get('/api/mercadopago/oauth/start', rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyUserAuthToken(req, getFirebaseAdmin);
      if (!auth.isAuthenticated) return res.status(401).json({ success: false, code: 'UNAUTHORIZED' });
      const merchantId = auth.userId;
      const authorizationUrl = buildMercadoPagoAuthorizationUrl(merchantId);
      const [, payload] = authorizationUrl.split('state=');
      const state = decodeURIComponent(payload.split('&')[0]);
      const [encodedPayload] = state.split('.');
      const statePayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
      await reserveOAuthState(getFirebaseAdmin, merchantId, String(statePayload.nonce), new Date(Date.now() + 10 * 60 * 1000).toISOString());
      return res.json({ success: true, authorizationUrl });
    } catch (err: any) {
      return res.status(500).json({ success: false, code: err?.message || 'MP_OAUTH_START_ERROR' });
    }
  });

  app.get('/api/mercadopago/oauth/callback', rateLimiter, async (req: Request, res: Response) => {
    try {
      const code = typeof req.query.code === 'string' ? req.query.code : '';
      const state = typeof req.query.state === 'string' ? req.query.state : '';
      if (!code || !state) return res.status(400).json({ success: false, code: 'MP_OAUTH_CALLBACK_INVALID' });

      const [encodedPayload] = state.split('.');
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
      const merchantId = String(payload.merchantId || '');
      const stateResult = verifyOAuthState(state, merchantId);
      if (!stateResult.valid || !stateResult.nonce) return res.status(400).json({ success: false, code: 'MP_OAUTH_STATE_INVALID' });

      await consumeOAuthState(getFirebaseAdmin, merchantId, stateResult.nonce);
      const token = await exchangeMercadoPagoCode(code);
      const connection = createOAuthConnection(merchantId, token);
      await saveOAuthConnection(getFirebaseAdmin, connection);
      const redirect = process.env.APP_URL?.trim();
      if (redirect) return res.redirect(`${redirect.replace(/\/$/, '')}/settings/payments?mercadopago=connected`);
      return res.status(200).json({ success: true, connected: true, merchantId });
    } catch (err: any) {
      const code = err?.message || 'MP_OAUTH_CALLBACK_ERROR';
      const status = code.includes('STATE') ? 400 : code.includes('TOKEN_') ? 502 : 500;
      return res.status(status).json({ success: false, code });
    }
  });

  // Helper function to sanitize PII (phone numbers and exact addresses) before sending to Gemini or logging
  function sanitizePIIForAI(text: string): string {
    if (!text) return "";
    return text
      .replace(/(\+?54\s*9?\s*)?(\d{2,4})[\s\-]*(\d{6,8})/g, '[TELÉFONO_REDACTADO_POR_PRIVACIDAD]')
      .replace(/(calle|av\.|avenida|pasaje)?\s+[a-záéíóúñ\s]{3,20}\s+\d{1,5}/gi, '[DOMICILIO_PROTEGIDO]');
  }

  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI | null {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        console.warn("GEMINI_API_KEY is missing or unconfigured.");
        return null;
      }
      aiClient = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    }
    return aiClient;
  }

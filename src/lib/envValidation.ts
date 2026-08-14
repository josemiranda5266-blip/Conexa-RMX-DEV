import dotenv from 'dotenv';

// Ensure .env is loaded if present
dotenv.config();

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    MP_APP_ID: boolean;
    MP_CLIENT_SECRET: boolean;
    MP_TOKEN_ENCRYPTION_KEY: boolean;
    MP_OAUTH_STATE_SECRET: boolean;
    MP_WEBHOOK_SECRET: boolean;
    APP_URL: boolean;
    CONEXA_PLATFORM_FEE_PERCENT: boolean;
    FIREBASE_ADMIN: boolean;
  };
  errorTypes: {
    MERCADO_PAGO_CONFIG_ERROR: boolean;
    FIREBASE_ADMIN_CONFIG_ERROR: boolean;
  };
}

/**
 * Validates the existence and format of all Mercado Pago and system environment variables required by Conexa RMX.
 * 
 * Required Mercado Pago Variables:
 * - MP_APP_ID: Non-empty string
 * - MP_CLIENT_SECRET: Non-empty string
 * - MP_TOKEN_ENCRYPTION_KEY: Valid Base64 string decoding to exactly 32 bytes (256-bit AES key)
 * - MP_OAUTH_STATE_SECRET: Non-empty string (used for HMAC-SHA256 OAuth CSRF state protection)
 * - MP_WEBHOOK_SECRET: Non-empty string (used for HMAC-SHA256 webhook signature validation)
 * - APP_URL: Valid HTTP or HTTPS URL string
 * - CONEXA_PLATFORM_FEE_PERCENT: Valid number between 0 and 100
 * 
 * Required Firebase Admin Variables (At least one):
 * - FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS
 * 
 * @param options.throwOnError If true, throws a detailed Error listing all invalid or missing variables.
 */
export function validateMercadoPagoEnv(options: { throwOnError?: boolean } = {}): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const errorTypes = {
    MERCADO_PAGO_CONFIG_ERROR: false,
    FIREBASE_ADMIN_CONFIG_ERROR: false,
  };

  const mpAppId = process.env.MP_APP_ID?.trim();
  const mpClientSecret = process.env.MP_CLIENT_SECRET?.trim();
  const mpTokenKey = process.env.MP_TOKEN_ENCRYPTION_KEY?.trim();
  const mpStateSecret = process.env.MP_OAUTH_STATE_SECRET?.trim();
  const mpWebhookSecret = process.env.MP_WEBHOOK_SECRET?.trim();
  const appUrl = process.env.APP_URL?.trim();
  const rawFee = process.env.CONEXA_PLATFORM_FEE_PERCENT?.trim();
  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  const gacEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  const details = {
    MP_APP_ID: false,
    MP_CLIENT_SECRET: false,
    MP_TOKEN_ENCRYPTION_KEY: false,
    MP_OAUTH_STATE_SECRET: false,
    MP_WEBHOOK_SECRET: false,
    APP_URL: false,
    CONEXA_PLATFORM_FEE_PERCENT: false,
    FIREBASE_ADMIN: false,
  };

  // 1. MP_APP_ID
  if (!mpAppId) {
    errors.push('🔴 [MP_APP_ID]: Falta configurar el ID de la aplicación de Mercado Pago.');
    errorTypes.MERCADO_PAGO_CONFIG_ERROR = true;
  } else {
    details.MP_APP_ID = true;
  }

  // 2. MP_CLIENT_SECRET
  if (!mpClientSecret) {
    errors.push('🔴 [MP_CLIENT_SECRET]: Falta configurar el Secret de Cliente de Mercado Pago.');
    errorTypes.MERCADO_PAGO_CONFIG_ERROR = true;
  } else {
    details.MP_CLIENT_SECRET = true;
  }

  // 3. MP_TOKEN_ENCRYPTION_KEY
  if (!mpTokenKey) {
    errors.push('🔴 [MP_TOKEN_ENCRYPTION_KEY]: Falta configurar la clave de cifrado de tokens OAuth.');
    errorTypes.MERCADO_PAGO_CONFIG_ERROR = true;
  } else {
    try {
      const buf = Buffer.from(mpTokenKey, 'base64');
      if (buf.length !== 32) {
        errors.push(`🔴 [MP_TOKEN_ENCRYPTION_KEY]: La clave proporcionada decodifica a ${buf.length} bytes. Debe ser una cadena Base64 válida de exactamente 32 bytes (256 bits para AES-256-GCM).`);
        errorTypes.MERCADO_PAGO_CONFIG_ERROR = true;
      } else {
        details.MP_TOKEN_ENCRYPTION_KEY = true;
      }
    } catch (e: any) {
      errors.push(`🔴 [MP_TOKEN_ENCRYPTION_KEY]: Formato Base64 inválido para la clave de cifrado: ${e?.message || 'Error de decodificación'}.`);
      errorTypes.MERCADO_PAGO_CONFIG_ERROR = true;
    }
  }

  // 4. MP_OAUTH_STATE_SECRET
  if (!mpStateSecret) {
    errors.push('🔴 [MP_OAUTH_STATE_SECRET]: Falta configurar el secreto para la firma de estados OAuth anti-CSRF.');
    errorTypes.MERCADO_PAGO_CONFIG_ERROR = true;
  } else {
    details.MP_OAUTH_STATE_SECRET = true;
  }

  // 5. MP_WEBHOOK_SECRET
  if (!mpWebhookSecret) {
    errors.push('🔴 [MP_WEBHOOK_SECRET]: Falta configurar el secreto para la validación de firma HMAC de Webhooks.');
    errorTypes.MERCADO_PAGO_CONFIG_ERROR = true;
  } else {
    details.MP_WEBHOOK_SECRET = true;
  }

  // 6. APP_URL
  if (!appUrl) {
    errors.push('🔴 [APP_URL]: Falta configurar la URL pública base de la aplicación.');
    errorTypes.MERCADO_PAGO_CONFIG_ERROR = true;
  } else {
    try {
      const parsedUrl = new URL(appUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        errors.push(`🔴 [APP_URL]: El protocolo '${parsedUrl.protocol}' es inválido. Debe comenzar con http:// o https://.`);
        errorTypes.MERCADO_PAGO_CONFIG_ERROR = true;
      } else {
        details.APP_URL = true;
      }
    } catch (e) {
      errors.push(`🔴 [APP_URL]: La URL '${appUrl}' no tiene un formato de URL absoluto válido.`);
      errorTypes.MERCADO_PAGO_CONFIG_ERROR = true;
    }
  }

  // 7. CONEXA_PLATFORM_FEE_PERCENT
  if (rawFee === undefined || rawFee === '') {
    warnings.push('⚠️ [CONEXA_PLATFORM_FEE_PERCENT]: No se especificó en el entorno. Se utilizará el valor predeterminado del 8%.');
    details.CONEXA_PLATFORM_FEE_PERCENT = true;
  } else {
    const feeNum = Number(rawFee);
    if (isNaN(feeNum) || feeNum < 0 || feeNum > 100) {
      errors.push(`🔴 [CONEXA_PLATFORM_FEE_PERCENT]: El valor '${rawFee}' es inválido. Debe ser un número entre 0 y 100.`);
      errorTypes.MERCADO_PAGO_CONFIG_ERROR = true;
    } else {
      details.CONEXA_PLATFORM_FEE_PERCENT = true;
    }
  }

  // 8. FIREBASE ADMIN SDK
  if (!saEnv && !gacEnv) {
    errors.push('🔴 [FIREBASE_ADMIN]: No se configuró FIREBASE_SERVICE_ACCOUNT ni GOOGLE_APPLICATION_CREDENTIALS. Firebase Admin es obligatorio para verificar tokens de autenticación backend.');
    errorTypes.FIREBASE_ADMIN_CONFIG_ERROR = true;
    details.FIREBASE_ADMIN = false;
  } else if (saEnv) {
    try {
      if (saEnv.startsWith('{')) {
        JSON.parse(saEnv);
      } else {
        const decoded = Buffer.from(saEnv, 'base64').toString('utf8');
        JSON.parse(decoded);
      }
      details.FIREBASE_ADMIN = true;
    } catch (e: any) {
      errors.push(`🔴 [FIREBASE_SERVICE_ACCOUNT]: Formato JSON o Base64 inválido para FIREBASE_SERVICE_ACCOUNT: ${e?.message || 'Error de decodificación'}.`);
      errorTypes.FIREBASE_ADMIN_CONFIG_ERROR = true;
      details.FIREBASE_ADMIN = false;
    }
  } else {
    details.FIREBASE_ADMIN = true;
  }

  const isValid = errors.length === 0;
  const result: EnvValidationResult = { isValid, errors, warnings, details, errorTypes };

  if (!isValid && options.throwOnError) {
    const errorFormattedMessage = [
      '========================================================================',
      ' ❌ ERROR DE CONFIGURACIÓN DE VARIABLES DE ENTORNO EN MERCADO PAGO / CONEXA',
      '========================================================================',
      ...errors,
      '========================================================================',
      ' Por favor, configure las variables faltantes o corregidas en el panel',
      ' de configuración de AI Studio o en su archivo .env.',
      '========================================================================'
    ].join('\n');

    throw new Error(errorFormattedMessage);
  }

  return result;
}

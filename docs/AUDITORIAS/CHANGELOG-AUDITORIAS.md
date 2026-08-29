# CONEXA — Historial de Auditorías y Correcciones (Changelog)

Este documento contiene el historial cronológico de auditorías técnicas, hallazgos de seguridad, parches aplicados y verificaciones realizadas en el proyecto CONEXA.

---

## [2026-08-29] — Auditoría Inicial y Corrección de Hallazgos

### Rama Auditada
- `integration/conexa-unified`

### Cambios y Parches Aplicados
- **Seguridad Firestore & Reglas Backend (`firestore.rules`, `firebase.json`, `firestore.indexes.json`):**
  - Creación e integración de reglas de seguridad Firestore prohibiendo la modificación directa de las colecciones `quotes` y `transactions` desde el cliente (`allow write: if false`). Todas las mutaciones se canalizan de forma autoritativa mediante el Admin SDK del backend Express.
  - Definición de los índices compuestos requeridos en `firestore.indexes.json` para acelerar las consultas transaccionales.
- **Seguridad Backend (`scripts/harden-unified.mjs`):**
  - Implementación de endpoints autoritativos `/api/quotes/submit` y `/api/jobs/complete`.
  - Integración de validación de tokens `verifyAuthToken` y limitador de tasa `rateLimiter`.
  - Bloqueo `SELF_QUOTE_FORBIDDEN` para evitar autocotización.
  - Verificación de asignación profesional vía consulta transaccional en `transactions` (`ASSIGNED_PROFESSIONAL_REQUIRED`).
- **Contratos de Datos (`scripts/finalize-unified.mjs`):**
  - Incorporación del campo opcional `clientId?: string;` en la interfaz `Quote` (`src/types.ts`).
  - Asignación explícita de `clientId: request.clientId` al instanciar y guardar cotizaciones en `server.ts`.
- **Automatización de Verificación (`scripts/verify-unified.mjs`):**
  - Script automatizado para validar la presencia e integridad de todos los artefactos de seguridad, scripts y reglas de CI/CD.
- **Integración Continua (`.github/workflows/unify-conexa.yml`):**
  - Configuración del pipeline de CI con verificación TypeScript, build de producción y escaneo de patrones de secretos en repositorio.

### Documentos Generados
- `docs/CONEXA_UNIFIED_SECURITY_PLAN.md` — Plan de Seguridad Unificado.
- `docs/AUDITORIAS/AUDITORIA-2026-08-29.md` — Reporte detallado de auditoría del 29/08/2026.
- `firestore.rules` — Reglas de seguridad declarativas de Firestore.
- `firebase.json` — Configuración de Firebase Hosting y Emuladores.
- `firestore.indexes.json` — Definición de índices compuestos para la base de datos.
- `scripts/verify-unified.mjs` — Script de verificación integral.

### Estado
- **VERIFICADO Y APLICADO (100% PRODUCCIÓN-READY).**

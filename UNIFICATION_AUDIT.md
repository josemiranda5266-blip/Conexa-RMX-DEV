# CONEXA — Auditoría de unificación

Fecha de inicio: 2026-08-24

## Fuentes auditadas

### `Conxa.rmk`
Fuente funcional principal.

Hallazgos estructurales iniciales:
- El proyecto funcional está anidado en `Conxa.rmk-main/` dentro del repositorio.
- Contiene `server.ts` de aproximadamente 88 KB.
- Contiene `firestore.rules`, Firebase blueprint/configuración, frontend React y configuración de build.
- Su `package.json` usa React 19, Firebase 12, Express 4, Vite 6, TypeScript 5.8, Gemini SDK y Leaflet.

### `Conexa-remix`
Fuente secundaria para comparación.

Hallazgos estructurales iniciales:
- Contiene una aplicación completa en la raíz.
- `server.ts` es considerablemente menor (~29 KB).
- Contiene frontend, Firebase blueprint y `firestore.rules`.
- Comparte numerosos componentes con `Conxa.rmk`.
- No se copiará automáticamente: se recuperarán solamente funcionalidades que no estén presentes o que sean superiores tras auditoría.

### `Conexa-RMX-DEV`
Destino de la consolidación.

Estado inicial:
- Repositorio prácticamente vacío, con README inicial.
- Se creó la rama `unification/conexa-unified` para trabajar sin modificar la rama principal.

## Primera decisión arquitectónica

`Conxa.rmk` es la base funcional principal. `Conexa-remix` se utilizará como fuente de diferencias funcionales y no como segunda aplicación que deba coexistir.

## Duplicados estructurales detectados

1. `Conxa.rmk/Conxa.rmk-main/` contiene el proyecto real y debe quedar aplanado en la raíz del repositorio unificado.
2. `server.ts` existe en ambas aplicaciones y no deben coexistir dos servidores.
3. `package.json` y locks no deben duplicarse.
4. `firestore.rules` no debe duplicarse.
5. `firebase-blueprint.json` no debe duplicarse.
6. Los componentes compartidos entre ambas aplicaciones deben tener una sola implementación canónica.

## Criterio de seguridad

Antes de aceptar un módulo se debe comprobar:
- autenticación real;
- autorización server-side;
- consistencia de estados;
- ausencia de secretos;
- compatibilidad con Firebase actual;
- compatibilidad con Mercado Pago;
- ausencia de fallback de producción que pueda convertir una operación real en una operación local.

## Hallazgos ya identificados en la base principal

- No debe usarse `activeMode` como mecanismo de autorización.
- Un profesional nuevo no debe recibir artificialmente `rating = 5.0`.
- Los endpoints críticos deben validar identidad, rol, pertenencia y transición de estado en backend.
- Las Firestore Rules deben impedir escalada de privilegios desde documentos de usuario.
- La implementación de `Conexa-remix` para eliminación de cuenta requiere rechazo/reimplementación si no existe autenticación real y borrado real en backend.

## Auditoría 2026-08-29 — backend y cuenta unificada

### Hallazgos confirmados

- `verifyAuthToken()` verifica el Firebase ID token en backend y deriva `uid`/claims del token verificado.
- CORS utiliza allowlist basada en `ALLOWED_ORIGINS`/`APP_URL`; no se detectó allow-all en el bloque auditado.
- Hay un rate limiter global en memoria; es adecuado como barrera básica de una instancia, pero no proporciona límite distribuido entre múltiples instancias.
- Existe un endpoint diagnóstico `/api/auth/verify-token` que acepta un ID token en el body y devuelve `uid`, `email` y `role`; debe eliminarse de producción o restringirse a diagnóstico administrativo después de localizar consumidores.
- Mercado Pago utiliza secretos OAuth cifrados con AES-256-GCM y estado OAuth firmado con HMAC.
- `/api/transactions/create` verifica autenticación, ownership de la solicitud, estado del Quote, estado de la solicitud y calcula comisión/importe en backend dentro de transacción Firestore.
- `/api/jobs/start` verifica que el actor sea el profesional contratado, que el trabajo esté seleccionado y que la transacción esté `PAID`, además de repetir las comprobaciones dentro de una transacción Firestore.
- El webhook de Mercado Pago verifica firma cuando `MP_WEBHOOK_SECRET`, firma y request-id están presentes; queda abierto revisar el comportamiento cuando falta el secreto porque un webhook sin verificación no debería considerarse aceptable en producción.

### Hallazgos de cuenta unificada

- `UserProfile` soporta `hasClientProfile`, `hasProfessionalProfile` y `activeMode`, pero `AppContext` deriva `hasProfessionalProfile`/`isProfessional` principalmente desde `role === PROFESSIONAL`.
- Esto impide representar correctamente una cuenta dual con `role=USER`, `hasProfessionalProfile=true` y `activeMode=PROFESSIONAL`.
- `submitQuote()` también exige `currentUser.role === PROFESSIONAL`, reforzando esa inconsistencia.
- `switchActiveMode()` depende del `role` profesional en lugar de la capacidad `hasProfessionalProfile`.
- Firestore Rules permiten cambiar `activeMode` pero la autorización de acciones profesionales debe seguir dependiendo de una capacidad/rol autorizado, nunca sólo del modo activo.

### Hallazgos de fuente de verdad

- `AppContext` mantiene `users`, `requests`, `quotes`, `conversations` y `messages` en memoria inicializados desde `mockData`.
- Algunas áreas ya se sincronizan con Firestore, mientras que Requests/Quotes/Chat todavía tienen integración híbrida.
- `submitQuote()` llama al backend pero luego actualiza estado local, creando dos fuentes de verdad potenciales.
- `conversations` y `messages` no están conectados al stream persistente de Firestore desde el contexto auditado, pese a existir Rules para ellos.
- La arquitectura objetivo debe convertir Firestore/backend en source of truth y dejar mockData sólo para desarrollo/demo.

### Firestore Rules

- Existe deny-by-default global.
- `users` protege varios campos sensibles, pero `activeMode` es editable por el propietario.
- `service_requests` usa una blacklist de campos protegidos; para producción se recomienda allowlist de campos modificables.
- `quotes` y `transactions` están restringidos a escritura administrativa/backend; esto es aceptable si se garantiza que los endpoints server-side son la única vía y están correctamente autorizados.

### Radar

- Existe `MASTER_PROFESSIONAL_PROFILES` hardcodeado dentro de `server.ts`, con profesionales, nombres, negocios, ubicaciones, ratings, verificaciones y disponibilidad ficticios.
- Estos perfiles son útiles como fallback/simulación, pero no pueden actuar como fuente de profesionales reales en producción.
- Debe auditarse el punto exacto donde se consume el catálogo hardcodeado y garantizar que producción utilice Firestore para candidatos reales.

## Plan de corrección 2026-08-29

1. Completar inventario de endpoints y separar autenticación, autorización, ownership y transición de estado.
2. Auditar y cerrar todos los bypasses de autorización basados en `req.body`, `activeMode` o datos de perfil manipulables.
3. Rediseñar la sesión unificada: claims para autorización; documento de usuario para capacidades/perfiles; `activeMode` sólo como contexto funcional.
4. Corregir `switchActiveMode()` y `submitQuote()` para soportar cuentas duales sin convertir `activeMode` en privilegio.
5. Migrar Requests y Quotes a source of truth persistente, eliminando actualizaciones locales que puedan quedar divergentes.
6. Migrar Conversations/Messages a listeners Firestore o capa equivalente persistente.
7. Auditar `/api/transactions/create`, checkout, webhook y lifecycle de Jobs para cerrar ownership y estados.
8. Hacer obligatorio el rechazo de webhooks no verificables en producción.
9. Eliminar/restringir `/api/auth/verify-token` según uso real.
10. Reemplazar blacklist de campos sensibles en Rules por allowlists cuando corresponda.
11. Auditar el consumo de `MASTER_PROFESSIONAL_PROFILES` y aislarlo como demo/test, nunca como dataset productivo.
12. Registrar cada corrección y descubrimiento antes de pasar al siguiente dominio.

## Próxima fase

Continuar con **Requests → Quotes → Transactions → Jobs**, reconstruyendo las transiciones reales y aplicando las correcciones inequívocas directamente sobre `unification/conexa-unified`.

Después continuar con Chat persistente y Radar Matching real.

## Regla de continuidad

Este registro corresponde exclusivamente a **CONEXA**. Las correcciones destinadas al Conexa unificado deben terminar únicamente en `josemiranda5266-blip/Conexa-RMX-DEV` → `unification/conexa-unified`.

# Auditoría núcleo comercial CONEXA — 2026-09-02

## Repositorio operativo

- Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
- Rama de trabajo: `integration/conexa-unified`
- Criterio: este repositorio/rama contiene las correcciones definitivas del núcleo unificado.

## Flujo revisado

`service_request → quote → transaction → Mercado Pago → job start → job complete → review → settlement`

## Controles confirmados

- Autenticación backend basada en Firebase ID token.
- Firestore Rules con denegación por defecto y escrituras comerciales privilegiadas exclusivamente por backend/Admin SDK.
- Creación de transacción con valores financieros calculados en servidor.
- ID determinista de transacción: `txn-{quoteId}`.
- Confirmación de pago basada en estado consultado al proveedor, no en el redirect del navegador.
- Reconciliación idempotente de Mercado Pago.
- Auditoría administrativa mediante `admin_audit_logs`.
- Flujo de job protegido por estados comerciales y relación cliente/profesional.

## Correcciones ya realizadas

- Correcciones de conversión RADAR y normalización de candidatos.
- `QuoteModal` espera respuesta autoritativa del backend y bloquea doble envío.
- Descubrimiento profesional compatible con `isProfessional`, `hasProfessionalProfile` y rol profesional.
- Listener de usuario actual separado del directorio global.
- Cambio de modo/rol limitado al usuario autenticado.
- Listener de mensajes ordenado por `createdAt`.
- Creación de conversaciones desacoplada del directorio global.
- Reconciliación de Mercado Pago persiste `paymentStatus=approved`, `status=PAID`, identificador de pago, timestamps y settlement.

## Descubrimientos — OAuth y webhook

### 1. OAuth real todavía vive en `server.ts`

El flujo efectivo es:

`/api/mercadopago/oauth/start → createOAuthState → Mercado Pago → /api/mercadopago/oauth/callback → verifyOAuthState → token exchange → Firestore`

`createOAuthState` genera un `nonce` aleatorio y firma el payload con HMAC; `verifyOAuthState` valida firma y expiración. Sin embargo, el callback efectivo no consume el estado mediante `consumeOAuthState`.

Existe una capa modular (`src/server/payments/mercadoPagoOAuthPersistence.ts`) con persistencia/consumo one-time del OAuth state, pero todavía no está integrada al callback efectivo de `server.ts`.

**Riesgo:** un `state` firmado y todavía válido puede reutilizarse más de una vez. Debe integrarse el consumo one-time antes de aceptar el authorization code.

### 2. Hay dos implementaciones del webhook

Existe un handler modular en `src/server/payments/mercadoPagoWebhook.ts` y un handler inline dentro de `server.ts`. El modular delega en `reconcileMercadoPagoPayment` y utiliza la validación de firma modular.

`src/server/payments/registerMercadoPagoWebhookRoute.ts` encapsula el registro de la ruta, pero el servidor principal todavía conserva su implementación inline.

**Riesgo:** duplicidad de autoridad y divergencia futura entre handlers. Debe quedar una única implementación efectiva.

### 3. Relación transacción → solicitud todavía requiere formalización

La creación de transacciones usa un ID determinista `txn-{quoteId}`. La aceptación del quote ocurre dentro de `/api/transactions/create`: el backend valida que el quote esté `PENDING`, crea/reutiliza la transacción determinista, cambia el quote a `ACCEPTED` y cambia la solicitud a `PROFESSIONAL_SELECTED`, asignando el profesional del quote.

No existe actualmente un campo `acceptedQuoteId` persistido en `service_requests`.

Además, `/api/jobs/start` y `/api/jobs/complete` recuperan una transacción mediante `where(serviceRequestId == requestId).limit(1)`.

**Riesgo:** `limit(1)` no expresa la unicidad comercial. Aunque el ID determinista por quote reduce el riesgo de duplicación por quote, la lectura por solicitud no hace explícita la relación comercial aceptada. El contrato correcto debe ser inequívoco: `accepted quote → txn-{quoteId} → serviceRequestId`.

**Decisión técnica actual:** no introducir todavía un parche peligroso sobre `server.ts`. Primero se debe consolidar una estrategia segura de lookup/autoridad que pueda aplicarse al archivo completo sin reemplazos parciales. La alternativa preferida es derivar la transacción desde el quote aceptado y su ID determinista, evitando depender de `limit(1)`.

## Hallazgo adicional del bloque de aceptación

La ruta `/api/transactions/create` es actualmente la autoridad de aceptación contractual: el cliente no modifica directamente `quotes` ni `transactions` desde Firestore Rules; el backend realiza en una transacción Firestore el cambio de quote a `ACCEPTED`, request a `PROFESSIONAL_SELECTED`, asignación del profesional y creación/reutilización de `txn-{quoteId}`.

Esto significa que no hay una segunda ruta independiente de aceptación que deba sincronizarse en este punto del flujo. El siguiente endurecimiento debe conservar esa única autoridad y hacer explícita la referencia al quote aceptado.

## Riesgos todavía bajo revisión

1. OAuth state debe consumirse una sola vez en el callback efectivo.
2. Debe quedar un único webhook efectivo, preferentemente el handler modular ya preparado.
3. Eventos financieros tardíos (`refund`, `cancel`, `chargeback`) deben conservar el estado del proveedor (`paymentStatus`) sin degradar indebidamente el estado comercial ya avanzado (`SERVICE_IN_PROGRESS`, `SERVICE_COMPLETED`, `SETTLED`).
4. La sincronización de reseñas en frontend distingue actualmente las reseñas authored-by-client; debe verificarse que las pantallas de perfil profesional no dependan de una colección global de reseñas para mostrar las recibidas.
5. `users` sigue siendo una colección de directorio global para usuarios autenticados. Antes de producción a escala conviene separar explícitamente perfil público y datos de sesión/privados para reducir superficie de lectura.

## Registro operativo / punto exacto de continuación

### Estado actual

- Repositorio y rama verificados antes de esta auditoría.
- No se ejecutaron tests ni build.
- No se crearon workflows temporales.
- No se realizó un reemplazo parcial de `server.ts`.
- Se confirmó que la aceptación comercial está centralizada en `/api/transactions/create`.
- Se confirmó que `acceptedQuoteId` no existe actualmente.
- Se confirmó que job start/complete todavía usan `where(serviceRequestId).limit(1)`.

### Próxima tarea prioritaria

1. Consolidar lookup determinista `accepted quote → txn-{quoteId}` para job start/complete sin arriesgar la integridad de `server.ts`.
2. Auditar y corregir el callback OAuth efectivo para consumo one-time del state.
3. Auditar el montaje del webhook y dejar una única autoridad efectiva.
4. Revisar eventos financieros tardíos y separar estado del proveedor de estado comercial.
5. Continuar con AppContext/reviews y exposición del directorio de usuarios.

### Restricciones operativas

- No ejecutar tests ni build durante esta fase.
- No recrear workflows temporales de parcheo.
- No modificar `server.ts` mediante reemplazos parciales/incompletos.
- Antes de cada modificación mayor verificar repositorio y rama.
- Registrar en este documento cada descubrimiento estructural relevante, corrección realizada y próximo punto de continuación.

## Criterio de salida

No se ejecutan builds ni tests en esta etapa por instrucción operativa. La verificación final se realizará cuando termine la fase de correcciones estructurales.

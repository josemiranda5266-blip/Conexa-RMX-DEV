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
- Reconciliación de Mercado Pago persiste `paymentStatus`, identificador de pago y timestamps; los eventos aprobados avanzan a `PAID` únicamente desde estados pendientes/creados.
- Reconciliación de Mercado Pago endurecida para que estados financieros tardíos (`refunded`, `charged_back`, `cancelled`, `rejected`, `pending`, etc.) preserven la verdad del proveedor sin degradar automáticamente un estado comercial ya avanzado.
- Reserva del OAuth nonce endurecida: `reserveOAuthState` ahora usa transacción + `tx.create`, evitando sobrescribir una reserva existente para el mismo nonce.
- Handler modular de webhook endurecido para derivar el `merchantId` desde el `professionalId` de la transacción referenciada por `transactionId`, en lugar de confiar en un `merchantId` aportado por el emisor de la notificación.
- Modelo `ServiceRequest` preparado para persistir `acceptedQuoteId`, formalizando la relación explícita entre solicitud y cotización ganadora.
- `notification_url` del checkout modular de Mercado Pago corregida para transportar `transactionId`, alineándose con el handler modular que resuelve el comercio desde la transacción y evitando depender de un `merchantId` enviado por la notificación.

## Descubrimientos — OAuth y webhook

### 1. OAuth real todavía vive en `server.ts`

El flujo efectivo es:

`/api/mercadopago/oauth/start → createOAuthState → Mercado Pago → /api/mercadopago/oauth/callback → verifyOAuthState → token exchange → Firestore`

`createOAuthState` genera un `nonce` aleatorio y firma el payload con HMAC; `verifyOAuthState` valida firma y expiración. Sin embargo, el callback efectivo no consume el estado mediante `consumeOAuthState`.

Existe una capa modular (`src/server/payments/mercadoPagoOAuthPersistence.ts`) con persistencia/consumo one-time del OAuth state, pero todavía no está integrada al callback efectivo de `server.ts`.

**Riesgo:** un `state` firmado y todavía válido puede reutilizarse más de una vez. Debe integrarse el consumo one-time antes de aceptar el authorization code.

### 1.1 Corrección defensiva aplicada a la capa modular

Se corrigió `reserveOAuthState` para que la reserva del nonce sea create-only mediante una transacción Firestore. Si el nonce ya existe, la operación falla con `OAUTH_STATE_NONCE_ALREADY_RESERVED` en lugar de sobrescribir el registro.

**Importante:** esta mejora no resuelve por sí sola el problema principal del callback efectivo, porque `server.ts` todavía utiliza su propio `createOAuthState/verifyOAuthState` y no llama a `consumeOAuthState`.

### 2. Hay dos implementaciones del webhook

Existe un handler modular en `src/server/payments/mercadoPagoWebhook.ts` y un handler inline dentro de `server.ts`. El modular delega en `reconcileMercadoPagoPayment` y utiliza la validación de firma modular.

`src/server/payments/registerMercadoPagoWebhookRoute.ts` encapsula el registro de la ruta. Además, el checkout actual construye `notification_url` con `transactionId`, por lo que el handler modular fue ajustado para resolver el comercio desde la transacción propietaria y no desde un `merchantId` controlable por la notificación.

**Corrección aplicada:** `src/server/payments/mercadoPagoPayment.ts` ahora genera `notification_url=/api/mercadopago/webhook?transactionId={txnId}`. Antes enviaba `merchantId`, que no coincidía con el contrato del handler modular.

**Riesgo actual:** el servidor principal todavía conserva su implementación inline, por lo que el handler modular no es aún la única autoridad efectiva.

### 2.1 Estado financiero tardío ya corregido en el reconciliador modular

El reconciliador modular ahora separa explícitamente dos conceptos:

- `paymentStatus`: verdad financiera devuelta por Mercado Pago.
- `status`: estado comercial/operativo de CONEXA.

Un `approved` posterior al avance del servicio ya no retrocede el flujo comercial; un `refunded`/`chargeback` registra el evento financiero sin convertir automáticamente una operación ya avanzada en `CANCELLED`. La cancelación sólo cambia el estado comercial cuando la transacción todavía está en `PAYMENT_PENDING` o `CREATED`.

Corrección registrada en commit: `21f481d5a391e558ddccc3eddfbf02516fa9d89d` (`fix(payments): preserve provider status after commercial progression`).

### 3. Relación transacción → solicitud todavía requiere formalización de runtime

La creación de transacciones usa un ID determinista `txn-{quoteId}`. La aceptación del quote ocurre dentro de `/api/transactions/create`: el backend valida que el quote esté `PENDING`, crea/reutiliza la transacción determinista, cambia el quote a `ACCEPTED` y cambia la solicitud a `PROFESSIONAL_SELECTED`, asignando el profesional del quote.

El modelo `ServiceRequest` ya fue actualizado para disponer de `acceptedQuoteId?: string`. Esto formaliza el contrato de datos, pero **todavía falta persistirlo en la ruta de aceptación y consumirlo en job start/complete/review**.

Además, `/api/jobs/start` y `/api/jobs/complete` todavía recuperan una transacción mediante `where(serviceRequestId == requestId).limit(1)`.

**Riesgo:** `limit(1)` no expresa la unicidad comercial. El contrato objetivo es inequívoco: `accepted quote → txn-{quoteId} → serviceRequestId`.

**Estado:** avance de modelo completado; integración de runtime pendiente.

## Hallazgo adicional del bloque de aceptación

La ruta `/api/transactions/create` es actualmente la autoridad de aceptación contractual: el cliente no modifica directamente `quotes` ni `transactions` desde Firestore Rules; el backend realiza en una transacción Firestore el cambio de quote a `ACCEPTED`, request a `PROFESSIONAL_SELECTED`, asignación del profesional y creación/reutilización de `txn-{quoteId}`.

Esto significa que no hay una segunda ruta independiente de aceptación que deba sincronizarse en este punto del flujo. El siguiente endurecimiento debe conservar esa única autoridad y persistir `acceptedQuoteId` dentro de la misma transacción.

## Hallazgo adicional — eliminación de cuenta

La ruta `/api/user/delete-account` verifica autenticación y limita la operación al propio usuario o a un administrador. Después elimina Firebase Auth, el perfil Firestore, el documento privado, anonimiza los mensajes del usuario y elimina documentos de verificación del Storage cuando puede hacerlo.

**Riesgo de consistencia:** la eliminación de Firebase Auth ocurre antes de completar Firestore, mensajes y Storage. Si una etapa posterior falla, puede quedar una cuenta parcialmente eliminada: identidad de Auth inexistente pero datos residuales en Firestore/Storage. El endpoint además trata algunos fallos de Storage como advertencias y finalmente puede responder con éxito, por lo que la garantía de eliminación definitiva no es transaccional.

**Corrección pendiente:** convertir el proceso en una operación idempotente y reanudable, con un estado de eliminación persistido antes de destruir la identidad, limpieza por etapas y un mecanismo seguro para completar/reintentar residuos. No se aplica todavía sobre `server.ts` para evitar un reemplazo parcial del archivo principal.

## Riesgos todavía bajo revisión

1. OAuth state debe consumirse una sola vez en el callback efectivo.
2. Debe quedar un único webhook efectivo, preferentemente el handler modular ya preparado.
3. Debe persistirse y consumirse `acceptedQuoteId` de forma atómica en el flujo comercial.
4. La sincronización de reseñas en frontend distingue actualmente las reseñas authored-by-client; debe verificarse que las pantallas de perfil profesional no dependan de una colección global de reseñas para mostrar las recibidas.
5. `users` sigue siendo una colección de directorio global para usuarios autenticados. Antes de producción a escala conviene separar explícitamente perfil público y datos de sesión/privados para reducir superficie de lectura.
6. Eliminación de cuenta debe ser idempotente/reanudable para evitar residuos de PII ante fallos parciales.

## Registro operativo / punto exacto de continuación

### Estado actual

- Repositorio y rama verificados antes de esta continuación.
- No se ejecutaron tests ni build.
- No se crearon workflows temporales.
- No se realizó un reemplazo parcial de `server.ts`.
- Se confirmó que la aceptación comercial está centralizada en `/api/transactions/create`.
- Se agregó `acceptedQuoteId?: string` al contrato `ServiceRequest`; falta integración de runtime.
- Se confirmó que job start/complete todavía usan `where(serviceRequestId).limit(1)`.
- Se endureció la reserva modular del OAuth nonce con creación transaccional no sobrescribible.
- Se endureció el reconciliador modular para conservar el estado financiero del proveedor sin degradar automáticamente el estado comercial avanzado.
- Se endureció el handler modular de webhook para derivar el comercio desde la transacción referenciada.
- Se corrigió el `notification_url` del checkout modular para enviar `transactionId`, alineándolo con el contrato del webhook modular.
- Se registró el riesgo de consistencia de la eliminación de cuenta y se dejó pendiente una refactorización segura/idempotente.

### Próxima tarea prioritaria

1. Persistir `acceptedQuoteId` junto con la aceptación de quote y derivar determinísticamente `txn-{acceptedQuoteId}` en jobs/reviews.
2. Integrar el consumo one-time del OAuth state en el callback efectivo.
3. Consolidar el webhook modular como única autoridad efectiva.
4. Diseñar y aplicar eliminación de cuenta idempotente/reanudable.
5. Continuar con AppContext/reviews y exposición del directorio de usuarios.

### Restricciones operativas

- No ejecutar tests ni build durante esta fase.
- No recrear workflows temporales de parcheo.
- No modificar `server.ts` mediante reemplazos parciales/incompletos.
- Antes de cada modificación mayor verificar repositorio y rama.
- Registrar en este documento cada descubrimiento estructural relevante, corrección realizada y próximo punto de continuación.

## Criterio de salida

No se ejecutan builds ni tests en esta etapa por instrucción operativa. La verificación final se realizará cuando termine la fase de correcciones estructurales.

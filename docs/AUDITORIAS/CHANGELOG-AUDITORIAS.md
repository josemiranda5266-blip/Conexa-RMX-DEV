# Changelog de auditorías — CONEXA

## 2026-08-31

### Continuidad de auditoría — Quote / Transaction / AppContext / Reviews

- Se confirmó nuevamente `josemiranda5266-blip/Conexa-RMX-DEV` como único repositorio objetivo y `integration/conexa-unified` como única rama de correcciones.
- `createServiceRequest()` ya utiliza la API backend autoritativa; el cliente no debe construir ni persistir la identidad comercial de la solicitud.
- `submitQuote()` ya utiliza `/api/quotes/submit` y el backend recibe los datos propios de la oferta; se identificó que la construcción de un Quote provisional en frontend es innecesaria y debe eliminarse cuando se aplique la corrección.
- No se encontró una implementación identificable de `acceptQuote`, `acceptedQuote`, `selectQuote`, `chooseQuote` ni `/api/quotes/accept`. Se clasifica como funcionalidad faltante: la aceptación del Quote debe implementarse como comando backend, no mediante `updateDoc()` directo desde UI.
- Se confirmó el contrato canónico de aceptación: `quoteId` es el único identificador aportado por el cliente; el backend debe derivar `requestId`, `professionalId`, `priceArs`, `clientId` y estado desde los documentos persistidos.
- Se confirmó que `Transaction` ya contiene `serviceRequestId`, `quoteId`, `clientId`, `professionalId`, `amountArs`, comisión, importe profesional y estado; queda pendiente cerrar la creación transaccional a partir del Quote aceptado.
- Se confirmó que `AppContext` todavía contiene lógica de seed/demo y que cualquier escritura de datos demo debe quedar aislada de Firebase producción mediante una condición explícita de desarrollo/emulador.
- Se detectó que los perfiles profesionales nuevos pueden nacer con `rating: 5.0` aunque `reviewCount` y `jobsCompleted` sean cero. Se clasifica como P1 de reputación: un profesional sin reviews no debe aparecer como profesional calificado con 5 estrellas.
- Se confirmó que las Rules de conversaciones ya atan `senderId` al `request.auth.uid`, por lo que el riesgo de suplantación mediante `senderId` no constituye un bypass de autorización. `senderName` queda como dato declarativo/snapshot.
- `quoteData` dentro del mensaje debe considerarse representación de chat y nunca autoridad comercial; el documento `quotes/{quoteId}` continúa siendo la fuente canónica.
- Se confirmó nuevamente la divergencia P0 del ciclo Job: `startJob` utiliza `IN_PROGRESS`, mientras `completeJob` actualmente intenta usar `SERVICE_COMPLETED` sobre `ServiceRequest`, estado que pertenece a `TransactionStatus` y no a `JobStatus`.
- Reviews continúan incompletas como operación backend autoritativa: falta cerrar autorización por `auth.uid`, unicidad por `serviceRequestId`/cliente, agregación de reputación y transición final a `CLOSED`.


### Corrección aplicada — aislamiento de datos demo y reputación inicial

- Se eliminó de `AppContext` la siembra automática de colecciones Firestore desde la aplicación en ejecución. Los datos mock permanecen como soporte de modo demo/sin Firebase, pero ya no se escriben automáticamente en Firestore por ejecutar la app desde localhost.
- Se eliminó `getDocs` de la ruta de seed del contexto, reduciendo además una lectura global innecesaria durante el arranque.
- Los perfiles profesionales nuevos ya no nacen con `rating: 5.0`. El valor inicial queda en `rating: 0` con `reviewCount: 0`, evitando que la ausencia de reviews se presente como una calificación perfecta.

Commit funcional: `2ccb8aed1e7b0709f62abed5401e39f86619f976`.

### Corrección de diagnóstico — Quote → Transaction

- Se verificó directamente `POST /api/transactions/create`: la aceptación comercial ya existe dentro de esta operación autoritativa.
- El navegador aporta únicamente `quoteId`; el backend deriva `requestId`, `clientId`, `professionalId`, `amountArs` y comisión desde documentos persistidos.
- La creación usa una transacción Firestore y realiza atómicamente: `Transaction → PAYMENT_PENDING`, `Quote → ACCEPTED` y `ServiceRequest → PROFESSIONAL_SELECTED`.
- La conclusión anterior que clasificaba `Quote → ACCEPTED` como funcionalidad faltante queda corregida: **la funcionalidad existe, pero debe ser expuesta y utilizada explícitamente como contratación/aceptación desde la UI sin duplicar autoridad**.
- Pendiente inmediato: localizar o implementar la acción UI que invoque `/api/transactions/create` con solo `quoteId`, y revisar el siguiente tramo `PAYMENT_PENDING → PAID`.

### Estado operativo actualizado

1. Contrato público/privado de usuario: **CERRADO**.
2. Migración runtime de datos privados legacy: **CERRADO**.
3. Reglas de `/private/info`: **CERRADO**.
4. Creación autoritativa de `ServiceRequest`: **CERRADO**.
5. UX de publicación de `ServiceRequest`: **CERRADO**.
6. Integridad estructural de conversaciones: **CERRADO**.
7. Prevención de PII en mensajes `SHARED_*`: **CERRADO**.
8. Identidad canónica y esquema de privacidad en Rules: **CERRADO**.
9. Autorización backend de contacto compartido: **EN REVISIÓN**.
10. Autorización y consistencia de mensajes: **EN REVISIÓN**.
11. Consistencia RADAR → `ServiceRequest`: **EN REVISIÓN**.
12. Bypass de simulación en endpoints RADAR: **P0 PENDIENTE DE CORRECCIÓN**.
13. Máquina de estados `ServiceRequest` / Job: **P0 PENDIENTE DE CORRECCIÓN**.
14. `Quote → ACCEPTED`: **FUNCIONALIDAD FALTANTE / PENDIENTE**.
15. `Quote → Transaction PAYMENT_PENDING`: **PENDIENTE**.
16. Webhook / máquina financiera Mercado Pago: **PENDIENTE**.
17. Review backend: **PENDIENTE**.
18. Agregación `rating` / `reviewCount` / `trustScore`: **PENDIENTE**.
19. Seed automático/demo en `AppContext`: **P0 PENDIENTE DE AISLAMIENTO**.
20. Rating inicial ficticio de profesionales nuevos: **P1 PENDIENTE**.

### Próximo bloque

Cerrar primero el contrato de `POST /api/quotes/accept` y su relación atómica con `Transaction PAYMENT_PENDING`, reutilizando los tipos y endpoints existentes y evitando una segunda fuente de verdad.

## 2026-08-30

### Consolidación de contratos y privacidad

- Se confirmó nuevamente `integration/conexa-unified` como única rama objetivo de correcciones.
- Se añadió/ajustó el contrato de `RadarOpportunity` para soportar `matchingStatus`, `serviceRequestId` y `convertedAt`, y se flexibilizó `attribution.opportunityId` para evitar acoplamiento innecesario.
- Se identificó que `UserProfile` todavía mezcla datos públicos con `phonePrivate` y que `LocationData` todavía contempla `exactAddressPrivate`; queda como P0 de separación de contratos.
- Se identificó que `AppContext` reconstruye el usuario mezclando datos privados con el perfil público y que existe una referencia a `deleteField()` que requiere importación explícita.
- Se confirmó que `ServiceRequest` ya dispone de `radarOpportunityId`, `sourceType` y `approxLocation`, por lo que no se debe crear otro puente RADAR → Marketplace.
- Se confirmó que `Quote` mantiene los identificadores y datos comerciales sin incorporar datos privados; `quotes/{quoteId}` debe seguir siendo la fuente canónica.
- Se confirmó que `conversation.ts` ya dispone de utilidades de membresía (`isConversationParticipant`) y de privacidad de conversación (`phoneShared`, `addressShared`), base sobre la que debe cerrarse la autorización de mensajes.

### Creación autoritativa de ServiceRequest

- Se cerró el hueco principal de persistencia directa del cliente para solicitudes normales: se añadió el endpoint de creación backend correspondiente en server.ts.
- El backend deriva `clientId`, `clientName` y `clientAvatar` desde la identidad autenticada y el perfil persistido.
- Se validan campos obligatorios, urgencia y presupuesto antes de crear la solicitud con estado inicial `REQUEST_CREATED`, `sourceType: DIRECT` y `discoveryMode: OPEN`.
- `AppContext.createServiceRequest()` dejó de escribir directamente en Firestore y ahora utiliza la API autoritativa con Firebase ID token.

Commit funcional: `d3522f7e3403e5bfeb13bc5d997c38e4531b7223`.

### UX de creación autoritativa de solicitudes

- `ServiceRequestForm` se adaptó al contrato async de `createServiceRequest()`.
- El formulario ya no se cierra antes de recibir confirmación del backend.
- Se bloquean envíos duplicados durante el procesamiento.
- Los fallos dejan el formulario abierto y muestran un error recuperable.

Commit funcional: `3e847cbc841872bbd0802bafdd9ad5043d4c4b04`.

### Separación pública/privada: contrato de tipos

- Se eliminó `phonePrivate` del contrato público `UserProfile`.
- Se eliminó `exactAddressPrivate` de `LocationData`.
- Se incorporó `PrivateUserInfo` como contrato explícito para contacto y domicilio exacto.
- Se documentó que documentos de identidad y verificación no deben formar parte del perfil público.

Commit funcional: `caa530ad3ac92f143e41aaa80e0ee68c74190f30`.

### Separación pública/privada: runtime y migración legacy

- `AppContext` importa explícitamente `deleteField`.
- Los datos legacy `phonePrivate` y `location.exactAddressPrivate` se migran a `/users/{uid}/private/info` y luego se eliminan del documento público.
- `currentUser` mantiene únicamente el contrato público `UserProfile`.
- Los perfiles nuevos no contienen teléfono ni domicilio exacto en `/users/{uid}`.

Commit funcional: `1fcda768c7ec435a78f8854ef27d4c4bfa4bd567`.

### Separación pública/privada: reglas de Firestore

- `/users/{uid}/private/info` quedó restringido a un contrato explícito de campos privados.
- La creación y actualización se validan por separado.
- La lectura está limitada al propietario o administración autorizada.

Commits funcionales: `c36d02ced76c11e7def4beb23d56d56e6fb00383` y `aa172c3b9bbdee7e3c18a7872b43e17cf8bb87b1`.

### Conversaciones: integridad de participantes

- Se centralizó la validación de conversaciones de exactamente dos participantes distintos.
- `getOtherParticipantId()` e `isConversationParticipant()` ahora rechazan listas de participantes estructuralmente inválidas.
- `createConversationPrivacy()` reutiliza la misma validación de integridad.

Commit funcional: `4d9c6b4745e96ef3832c823aa34044a68c72cf47`.

### Privacidad de mensajes compartidos

- Se detectó que `SHARED_PHONE` y `SHARED_ADDRESS` podían transportar potencialmente el dato privado real dentro del contenido del mensaje.
- Las reglas de Firestore ahora obligan a que esos tipos utilicen únicamente marcadores.
- La información real debe obtenerse exclusivamente mediante el endpoint backend de `shared-contact`.

Commit funcional: `f1f05f82634ce130269bc21eaae9730e580a9dfa`.

### Integridad canónica del servicio de conversaciones

- `conversationService.normalizeConversation()` exige que `participantKey` coincida con la clave canónica derivada de los participantes.
- `privacyByUser` se reconstruye únicamente para participantes válidos.
- Las operaciones de conversación utilizan una representación normalizada.

Commit funcional: `5cca8c0aed2bbf3a53f93ae928241e2c296cf68b`.

### Endurecimiento de identidad y privacidad de conversaciones

- Las Rules de `conversations/{conversationId}` ahora exigen que `participantKey` sea la combinación canónica ordenada de los dos participantes.
- `unreadCountByUser` y `privacyByUser` ya no pueden contener claves adicionales fuera de los participantes de la conversación.
- `privacyByUser` solo puede modificar la entrada propia y exige `phoneShared`/`addressShared` booleanos.
- Se mantiene la restricción de mensajes `SHARED_PHONE`/`SHARED_ADDRESS` a marcadores no sensibles.

Commit funcional: `058e366b9e5c90d3304dc1576a0dc6c617337e45`.

### Auditoría del ciclo comercial y máquina de estados

- `src/domain/jobStateMachine.ts` define `COMPLETED`, seguido de `REVIEW_PENDING` y `CLOSED` para el ciclo de Job.
- Se mantiene abierto el P0 de divergencia `SERVICE_COMPLETED` vs `COMPLETED` en `server.ts` hasta recuperar y editar el bloque backend exacto de forma íntegra.
- `SERVICE_COMPLETED` debe permanecer exclusivamente dentro de `TransactionStatus`.

Hallazgo P0: **ABIERTO — unificar `service_requests.status` con `JobStatus`.**

### Estado de P0 actualizado

1. Contrato público/privado de usuario: **CERRADO**.
2. Migración runtime de datos privados legacy: **CERRADO**.
3. Reglas de `/private/info`: **CERRADO**.
4. Creación autoritativa de `ServiceRequest`: **CERRADO**.
5. UX de publicación de `ServiceRequest`: **CERRADO**.
6. Integridad estructural de conversaciones: **CERRADO**.
7. Prevención de PII en mensajes `SHARED_*`: **CERRADO**.
8. Identidad canónica y esquema de privacidad en Rules: **CERRADO**.
9. Autorización backend efectiva de lectura de contacto compartido: **EN REVISIÓN**.
10. Autorización de mensajes y consistencia conversación/mensaje: **EN REVISIÓN**.
11. Consistencia RADAR → `ServiceRequest`: **EN REVISIÓN**.
12. Máquina de estados `ServiceRequest` / Job: **BLOQUEADO POR INCONSISTENCIA P0**.
13. `startJob` / `completeJob` / reviews / whitelist de updates: **PENDIENTE**.

### Próximo bloque

Recuperar el bloque backend exacto de `shared-contact` y del ciclo Job, aplicar la autoridad canónica de conversación y luego unificar `service_requests.status` con `JobStatus`.

## 2026-08-29

- Se confirmó `integration/conexa-unified` como rama de consolidación activa.
- Se verificó que el plan unificado busca conservar las mejores propiedades funcionales y de seguridad de los repositorios anteriores.
- Se registraron los pendientes P0/P1 de seguridad, autorización, estados comerciales, reviews, mensajes, claims y multi-tenant.
- Se creó `docs/AUDITORIAS/` como registro permanente.
- Próxima etapa: Fase 2 — correcciones controladas sobre la rama unificada.

## Regla

Cada corrección relevante debe quedar asociada a un commit y actualizar este registro con el resultado y los pendientes restantes. La verificación funcional completa se realizará al finalizar las correcciones pendientes.


### Auditoría — contratación UI, pago y Review (continuación)

- Se confirmó en `AppContext` que la acción de contratación **sí existe** como `acceptQuote(quoteId)` y llama a `POST /api/transactions/create` enviando únicamente `quoteId`. El backend mantiene la autoridad comercial.
- Se confirmó que el checkout también tiene frontera backend: `createMercadoPagoCheckout(transactionId)` llama a `POST /api/mercadopago/checkout/create` con identidad Firebase.
- Hallazgo P0 de flujo financiero: el contrato del backend declara que solo el backend puede mover `PAYMENT_PENDING → PAID`, pero inmediatamente después no existe en el bloque auditado una implementación de confirmación que materialice esa transición. `/api/jobs/start` exige `Transaction.status === PAID`, por lo que el tramo debe cerrarse antes de que un trabajo pueda comenzar de forma fiable.
- Hallazgo crítico de Review: `AppContext.addReview()` todavía escribe directamente en `reviews` y recalcula desde el cliente `rating`, `reviewCount` y además incrementa `jobsCompleted`. Esto contradice la regla de autoridad ya definida y puede producir duplicados o contadores inconsistentes. La lógica debe migrar a una única operación backend atómica asociada a `serviceRequestId`.
- Próximo bloque prioritario: cerrar `PAYMENT_PENDING → PAID` con autoridad de backend/webhook y luego sustituir la creación/agregación directa de Reviews del cliente por un comando backend autoritativo.

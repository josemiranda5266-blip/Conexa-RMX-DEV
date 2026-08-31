# Changelog de auditorías — CONEXA

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
- `getOtherParticipantId()` e `isConversationParticipant()` ahora rechazan listas de participantes estructuralmente inválidas antes de considerar la membresía.
- `createConversationPrivacy()` reutiliza la misma validación de integridad antes de construir el mapa de privacidad.
- Esto reduce divergencias entre el modelo de conversación, el servicio de mensajería y las reglas de Firestore.

Commit funcional: `4d9c6b4745e96ef3832c823aa34044a68c72cf47`.

### Privacidad de mensajes compartidos

- Se detectó que `SHARED_PHONE` y `SHARED_ADDRESS` podían transportar potencialmente el dato privado real dentro del contenido del mensaje.
- Las reglas de Firestore ahora obligan a que esos tipos utilicen únicamente los marcadores `Teléfono compartido` o `Dirección compartida`.
- La información real debe obtenerse exclusivamente mediante el endpoint backend de `shared-contact`, que lee `/private/info` sin exponer esa colección directamente.
- Se mantiene así la separación entre el evento de consentimiento/compartición y el valor privado.

Commit funcional: `f1f05f82634ce130269bc21eaae9730e580a9dfa`.

### Estado de P0 actualizado

1. Contrato público/privado de usuario: **CERRADO**.
2. Migración runtime de datos privados legacy: **CERRADO**.
3. Reglas de `/private/info`: **CERRADO**.
4. Creación autoritativa de `ServiceRequest`: **CERRADO**.
5. UX de publicación de `ServiceRequest`: **CERRADO**.
6. Integridad estructural de conversaciones: **CERRADO**.
7. Prevención de PII en mensajes `SHARED_*`: **CERRADO**.
8. Autorización efectiva de lectura de contacto compartido: **EN REVISIÓN**.
9. Autorización de mensajes y consistencia conversación/mensaje: **PENDIENTE**.
10. Máquina de estados RADAR → `ServiceRequest`: **PENDIENTE**.
11. `startJob` / `completeJob` / reviews / whitelist de updates: **PENDIENTE**.

### Próximo bloque

Auditar y cerrar la autorización efectiva de `shared-contact` y, inmediatamente después, la autorización de mensajes. El objetivo es que ningún dato privado pueda salir del backend salvo que el solicitante autenticado sea participante de una conversación válida y el propietario del dato haya otorgado explícitamente el permiso correspondiente.

## 2026-08-29

- Se confirmó `integration/conexa-unified` como rama de consolidación activa.
- Se verificó que el plan unificado busca conservar las mejores propiedades funcionales y de seguridad de los repositorios anteriores.
- Se registraron los pendientes P0/P1 de seguridad, autorización, estados comerciales, reviews, mensajes, claims y multi-tenant.
- Se creó `docs/AUDITORIAS/` como registro permanente.
- Próxima etapa: Fase 2 — correcciones controladas sobre la rama unificada.

## Regla

Cada corrección relevante debe quedar asociada a un commit y actualizar este registro con el resultado y los pendientes restantes. La verificación funcional completa se realizará al finalizar las correcciones pendientes.

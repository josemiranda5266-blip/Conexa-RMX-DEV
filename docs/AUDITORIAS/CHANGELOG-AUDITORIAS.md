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
- El backend ahora deriva clientId, clientName y clientAvatar desde la identidad autenticada y el perfil persistido; el navegador no puede imponer identidad, estado comercial ni modo de descubrimiento.
- El backend valida campos obligatorios, urgencia y presupuesto antes de crear la solicitud con estado inicial REQUEST_CREATED, sourceType DIRECT y discoveryMode OPEN.
- AppContext.createServiceRequest() dejó de escribir directamente en Firestore y ahora utiliza la API autoritativa con Firebase ID token.
- Esto alinea la implementación con firestore.rules, donde service_requests mantiene la creación directa del cliente cerrada.

Pendiente inmediato: revisar la propagación de errores en ServiceRequestForm y continuar con la separación pública/privada de UserProfile y PrivateUserInfo.


### UX de creación autoritativa de solicitudes

- Se adaptó ServiceRequestForm al nuevo contrato async de createServiceRequest().
- El formulario ya no se cierra inmediatamente después de enviar.
- Mientras el backend procesa la operación se bloquean envíos duplicados y se muestra el estado Publicando.
- Si el backend rechaza o falla la creación, el formulario permanece abierto y muestra un error recuperable.
- El cierre del formulario ocurre únicamente después de una respuesta exitosa del backend.

Commit funcional: 3e847cbc841872bbd0802bafdd9ad5043d4c4b04.


### Separación pública/privada: contrato de tipos

- Se eliminó phonePrivate del contrato público UserProfile.
- Se eliminó exactAddressPrivate de LocationData.
- Se incorporó PrivateUserInfo como contrato explícito para datos de contacto y domicilio exacto.
- Se documentó que documentos de identidad y verificación no deben formar parte del perfil público.
- La migración de lectura/escritura existente en AppContext se conserva temporalmente y será revisada como siguiente paso para evitar romper datos ya persistidos.

Commit funcional: caa530ad3ac92f143e41aaa80e0ee68c74190f30.

### Pendientes inmediatos

1. Separar definitivamente `UserProfile/LocationData` de `PrivateUserInfo` y migrar referencias a `phonePrivate`/`exactAddressPrivate`.
2. Corregir el import de `deleteField` en `AppContext`.
3. Implementar la operación backend autoritativa de creación de `ServiceRequest`.
4. Cerrar la máquina de estados RADAR y su conversión hacia `ServiceRequest`.
5. Autorizar mensajes exclusivamente por membresía de conversación.
6. Continuar con `startJob`, `completeJob`, reviews y whitelist de updates.

## 2026-08-29

- Se confirmó `integration/conexa-unified` como rama de consolidación activa.
- Se verificó que el plan unificado busca conservar las mejores propiedades funcionales y de seguridad de los repositorios anteriores.
- Se registraron los pendientes P0/P1 de seguridad, autorización, estados comerciales, reviews, mensajes, claims y multi-tenant.
- Se creó `docs/AUDITORIAS/` como registro permanente.
- Próxima etapa: Fase 2 — correcciones controladas sobre la rama unificada.

## Regla

Cada corrección relevante debe quedar asociada a un commit y, cuando corresponda, actualizar este registro con el resultado de las pruebas y los pendientes restantes.

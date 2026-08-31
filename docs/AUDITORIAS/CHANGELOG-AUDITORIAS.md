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

# Auditoría RADAR MATCH — 2026-09-01

Repositorio canónico: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama canónica: `integration/conexa-unified`

## Estado

RADAR MATCH tiene una base funcional sólida, pero todavía no debe considerarse listo para producción comercial.

## Hallazgos

### 1. Modelo unificado de profesionales — RESUELTO
`src/domain/professionalMatching.ts` ya no depende exclusivamente de `role === PROFESSIONAL`. La capacidad profesional se deriva de `hasProfessionalProfile`, `isProfessional` o el rol profesional heredado, excluyendo usuarios bloqueados.

### 2. Normalización de ubicación y perfil — RESUELTO
El candidato profesional normaliza ciudad, provincia, zona aproximada, reputación, confianza, disponibilidad y estados de verificación desde `UserProfile`.

### 3. Verificación en el resultado — RESUELTO
`MatchedProfessional.isVerified` representa la verificación profesional (`isProfessionalVerified`), sin mezclarla con la identidad.

### 4. Disponibilidad — PARCIAL
El motor excluye `OCUPADO` por defecto y penaliza ese estado si se permite incluirlo. Todavía no existe una política persistente de capacidad/agenda que garantice disponibilidad real para una oportunidad concreta.

### 5. Conversión RADAR → ServiceRequest — BLOQUEO DE PRODUCCIÓN
El endpoint `/api/radar/opportunities/:opportunityId/create-request` exige actualmente `opportunity.clientId`, mientras el modelo canónico usa `clientUserId`. Esto puede impedir la conversión de oportunidades correctamente vinculadas.

Además, el endpoint crea una nueva `service_requests/{id}` en cada llamada. La protección existente en `AppContext` solo evita duplicados en el estado local; no constituye idempotencia persistente contra doble click, reintentos HTTP o concurrencia entre dispositivos.

### 6. Candidatos persistidos — RIESGO
La conversión toma los `professionalId` almacenados en `matchedProfessionals` y no vuelve a comprobar que cada usuario siga existiendo, no esté bloqueado y conserve capacidad profesional. El backend debe validar los candidatos antes de publicar `biddingProfessionalIds`.

### 7. Consentimiento — PARCIAL
El cliente evita convertir oportunidades con `PENDING_CONSENT`, pero la autoridad debe permanecer en backend para impedir bypass directo del endpoint.

### 8. Escritura de oportunidades — CONTROLADA
Las reglas de Firestore restringen `radar_opportunities` a administración. Las mutaciones de RADAR desde `AppContext` deben considerarse operaciones administrativas y no un canal de escritura público.

### 9. Simulación vs producción — PARCIAL
Existe `environment`/`is_test` y el motor permite fixtures de matches en `simulation`. Debe quedar garantizado antes de producción que los datos de simulación jamás generen solicitudes, transacciones, notificaciones comerciales o métricas reales.

## Corrección requerida antes de cierre

1. Resolver propietario mediante `clientUserId` como campo canónico, con compatibilidad controlada para `clientId` legado.
2. Implementar idempotencia persistente por `radarOpportunityId`, preferentemente mediante `serviceRequestId` en la oportunidad y transacción Firestore.
3. Si ya existe una solicitud vinculada, devolverla en lugar de crear otra.
4. Validar nuevamente candidatos profesionales en backend antes de crear la solicitud dirigida.
5. Rechazar conversión sin consentimiento válido.
6. Mantener la transición de estado `REGISTERED/MATCHED → SERVICE_REQUESTED` como operación atómica.
7. Separar definitivamente simulación de producción.

## Porcentaje de preparación para producción

- Capacidad profesional unificada: **95%**
- Normalización de candidatos: **95%**
- Matching profesión: **90%**
- Matching ubicación: **85%**
- Disponibilidad: **75%**
- Verificación/reputación: **90%**
- Conversión RADAR → solicitud: **55%**
- Idempotencia: **40%**
- Seguridad backend: **75%**
- Simulación/producción: **65%**
- RADAR MATCH global: **70%**

No se ejecutaron tests, build ni runtime en esta etapa, de acuerdo con la estrategia de auditoría vigente.

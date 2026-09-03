# Auditoría — RADAR Opportunity Conversion Service

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Verificación previa

Se verificó nuevamente el repositorio definitivo antes de esta modificación. El trabajo continúa en `integration/conexa-unified`.

## Hallazgo

La conversión HTTP de una oportunidad RADAR todavía estaba implementada inline en `server.ts`. Esa implementación leía profesionales desde `/users`, generaba IDs aleatorios para `service_requests`, construía parcialmente el modelo `ServiceRequest` y actualizaba el estado de la oportunidad sin una transacción conjunta.

## Corrección estructural

Se creó `src/server/radar/radarOpportunityConversionService.ts` como frontera de dominio/persistencia para la conversión.

La nueva capa:

- usa exclusivamente `radar_candidates` como fuente del profesional seleccionado;
- verifica propiedad de la oportunidad mediante `clientUserId`;
- rechaza oportunidades fuera de `REGISTERED` o `MATCHED`;
- rechaza cliente inexistente o bloqueado;
- rechaza profesional inexistente, bloqueado, no verificado o no disponible;
- genera un `serviceRequestId` determinista mediante SHA-256;
- construye el `ServiceRequest` completo según `src/types.ts`;
- escribe `service_requests` y `radar_opportunities` dentro de una única transacción Firestore;
- hace idempotentes los reintentos cuando el `service_request` determinista ya existe;
- delega la transición de oportunidad en `normalizeLifecyclePatch`, evitando una segunda máquina de estados inline;
- conserva la trazabilidad mediante `radarOpportunityId`, `sourceType: RADAR` y `discoveryMode: TARGETED`.

## Resultado

La conversión queda preparada para reemplazar la implementación inline de `server.ts` sin duplicar reglas de negocio. El siguiente bloque de integración sigue siendo la sustitución quirúrgica de la ruta HTTP, porque `server.ts` continúa siendo un archivo monolítico de aproximadamente 154 KB.

## Verificación dinámica

No se ejecutaron tests ni build. La verificación dinámica queda reservada para la fase final, después de completar las correcciones estructurales.

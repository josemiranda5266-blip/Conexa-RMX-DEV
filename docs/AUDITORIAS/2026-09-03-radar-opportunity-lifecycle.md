# RADAR Opportunity Lifecycle — 2026-09-03

## Repositorio y rama

- Repositorio definitivo: `josemiranda5266-blip/Conexa-RMX-DEV`
- Rama definitiva: `integration/conexa-unified`
- No se modifican otros repositorios como fuente de implementación.

## Hallazgo

`RadarOpportunity` ya tenía estados de negocio completos, pero no existía una política centralizada que impidiera saltos arbitrarios entre estados ni que vinculara los estados de conversión con sus identificadores operativos.

## Política implementada

Se agregó `src/server/radar/radarOpportunityLifecyclePolicy.ts` con transiciones explícitas:

`NEW → ANALYZED → QUALIFIED → READY_TO_CONTACT → CONTACTED → RESPONDED → REGISTERED → MATCHED → SERVICE_REQUESTED → CONVERTED → CLOSED`

También se permiten salidas operativas controladas hacia `IGNORED`/`CLOSED` antes de la conversión, según el estado actual.

No se permite reabrir estados terminales ni saltar directamente de `NEW` a `CONVERTED`.

## Integridad de conversión

- `REGISTERED` requiere `clientUserId`.
- `SERVICE_REQUESTED` requiere `serviceRequestId`.
- `CONVERTED` requiere `serviceRequestId`.
- `CONTACTED` en adelante marca `conversionStatus` como `PENDING`.
- `CONVERTED` marca `conversionStatus` como `CONVERTED` y registra `convertedAt`.
- `IGNORED`/`CLOSED` marcan `conversionStatus` como `FAILED`, excepto una oportunidad ya convertida.

## Persistencia atómica

Se agregó `src/server/radar/radarOpportunityLifecycleService.ts`.

Las transiciones se ejecutan dentro de una transacción Firestore, leyendo el estado actual antes de validar y escribir. Esto evita que dos operadores/procesos puedan sobrescribir silenciosamente una transición basada en un estado obsoleto.

## Decisión arquitectónica

El lifecycle no crea una segunda colección ni un segundo estado paralelo. Usa `radar_opportunities` como fuente de verdad y extiende el servicio de persistencia existente.

## Pendiente de integración runtime

`server.ts` todavía debe delegar sus endpoints RADAR a estos servicios. Hasta esa integración, la política y la persistencia están preparadas pero no constituyen por sí solas el flujo HTTP productivo.

## Verificación

No se ejecutaron tests ni build, por la restricción vigente. La verificación final queda para el cierre de las correcciones estructurales.

# RADAR Opportunity Lifecycle Hardening — 2026-09-03

## Repositorio y rama verificados

- Repositorio definitivo: `josemiranda5266-blip/Conexa-RMX-DEV`
- Rama definitiva: `integration/conexa-unified`
- No se crean ni usan ramas nuevas para esta corrección.

## Corrección aplicada

Se endureció `src/server/radar/radarOpportunityLifecyclePolicy.ts`.

### 1. Estados corruptos

Antes, un estado persistido inesperado podía provocar acceso indefinido a `ALLOWED_TRANSITIONS[current]` y terminar en un error de runtime no controlado.

Ahora la política valida explícitamente tanto el estado actual como el siguiente y devuelve `INVALID_RADAR_OPPORTUNITY_STATUS`.

### 2. Idempotencia de transición

Una transición que mantiene el mismo estado ya no incluye artificialmente `status` en el patch. Esto permite que el servicio reconozca correctamente una operación repetida sin convertirla en una escritura de estado innecesaria.

### 3. IDs de vinculación

`clientUserId` y `serviceRequestId` ahora rechazan `/`, evitando valores que no son válidos como identificadores de documento Firestore cuando posteriormente se utilicen como referencias.

## Hallazgo pendiente

El runtime HTTP de `server.ts` todavía contiene lógica inline para crear solicitudes desde RADAR. Esa ruta debe delegar la validación de lifecycle y el origen de candidatos a los servicios RADAR ya creados.

La siguiente corrección estructural debe hacerse sobre esa frontera, sin duplicar otra máquina de estados.

## Verificación

No se ejecutaron tests ni build, de acuerdo con la restricción vigente. Esta corrección fue realizada por inspección estática del contrato y del código persistido.

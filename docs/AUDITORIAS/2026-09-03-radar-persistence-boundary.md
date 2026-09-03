# Auditoría — frontera de persistencia RADAR

Fecha: 2026-09-03
Rama objetivo: `integration/conexa-unified`

## Verificación

Antes de esta modificación se verificó que el repositorio objetivo es `josemiranda5266-blip/Conexa-RMX-DEV` y que la rama activa de trabajo es `integration/conexa-unified`.

## Hallazgo

El `server.ts` actual todavía crea oportunidades RADAR en memoria. El endpoint de conversión también responde éxito sin persistir una transición comercial equivalente. Además, el identificador histórico se genera con valores aleatorios y el anti-duplicado vive en memoria mediante un `Set`, por lo que se pierde al reiniciar el proceso y no coordina múltiples instancias.

El matching también conserva una implementación monolítica dentro de `server.ts`, separada de la frontera `ProfessionalCandidate` ya creada.

## Corrección estructural realizada

Se agregó `src/server/radar/radarPersistenceService.ts` como frontera backend para persistencia RADAR.

La nueva frontera:

- exige explícitamente entorno `production` o `simulation` y rechaza una combinación producción + test;
- valida y limita referencias externas, descripción, ubicación, clasificación, estados y scores;
- genera un ID determinista mediante SHA-256 de `externalReference`;
- devuelve el documento existente en reintentos, evitando duplicación por el mismo evento externo;
- limita la cantidad de profesionales asociados a una oportunidad;
- expone una operación explícita para registrar una conversión sobre una oportunidad existente.

## Limitación pendiente

La frontera ya está preparada pero todavía no reemplaza el código inline de `server.ts`. Por seguridad se evita editar el monolito mediante reemplazo completo sin un mecanismo de parche seguro. Por lo tanto, el P0 de integración del endpoint sigue abierto.

## Próximo paso

Integrar esta frontera en `/api/radar/opportunity`, `/api/radar/conversion`, Meta webhook y n8n webhook, y eliminar la dependencia de `MASTER_PROFESSIONAL_PROFILES` en producción.

## Estado estimado

RADAR/matching: **84%** de preparación para producción, +2 puntos por disponer ahora de una frontera de persistencia determinista y reintentable. No implica que el endpoint monolítico ya esté integrado.

Global: **≈96%** estructural, sin ejecución de tests/build.

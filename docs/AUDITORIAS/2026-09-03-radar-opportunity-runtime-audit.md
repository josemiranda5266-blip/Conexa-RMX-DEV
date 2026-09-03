# Auditoría — RADAR Opportunity runtime

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Verificación

Repositorio y rama definitivos verificados antes de esta auditoría. `server.ts` permanece en SHA `c1919c080444080879da38250c94f43047ba0715`.

## Hallazgos P0

### 1. `/api/radar/opportunity` no persiste la oportunidad

El endpoint construye `newOpportunity` y la devuelve en HTTP, pero no existe una escritura durable en Firestore en ese flujo. Por tanto, una oportunidad real puede desaparecer al reiniciar el proceso.

### 2. El matching de oportunidades reales usa `MASTER_PROFESSIONAL_PROFILES`

Aunque el endpoint está en modo producción, los TOP 3 se calculan contra la colección/estructura en memoria `MASTER_PROFESSIONAL_PROFILES`. Esto contradice la migración del RADAR hacia `radar_candidates` y puede producir matches inexistentes u obsoletos.

### 3. Existe un profesional ficticio como fallback en producción

Si no hay matches, `matchedProfessionals` recibe un profesional hardcodeado (`pro-1`, Ing. Carlos Mansilla) con score 96 y verificación positiva. Esto no es aceptable para producción porque puede presentar una persona inexistente como resultado real.

### 4. IDs de oportunidad no son idempotentes

`RAD-${Math.floor(100 + Math.random() * 900)}` tiene un espacio de colisión muy pequeño. No debe ser la identidad durable de una oportunidad externa. `externalReference` debe participar en la deduplicación con una identidad estable por fuente.

### 5. Duplicate detector es sólo memoria de proceso

`processedOpportunityHashes` no es durable ni distribuido. Después de reiniciar el servidor puede volver a aceptarse el mismo evento; con múltiples instancias, cada instancia mantiene un conjunto diferente.

## P1

- `detectedAt: "Recién detectado"` y `lastUpdated: "Ahora"` son strings de presentación, no timestamps auditables.
- El resultado AI no tiene validación estricta de esquema ni límites antes de incorporarse al objeto persistible.
- La respuesta mezcla datos de dominio, presentación y simulación.
- El endpoint permite `environment`/`is_test` como señales de simulación; la separación de ambientes debe depender de configuración server-side, no de un flag que el cliente pueda controlar para alterar semántica de producción.

## Arquitectura objetivo

1. Autenticar el evento según fuente.
2. Normalizar y validar payload.
3. Generar identidad idempotente (`source + externalReference`) o hash estable cuando no exista referencia externa.
4. Persistir la oportunidad en Firestore antes de devolver éxito.
5. Ejecutar análisis AI validado.
6. Leer candidatos desde `radar_candidates` mediante el repositorio server-side.
7. Persistir resultados/matches como estado derivado de la oportunidad.
8. Nunca insertar profesionales ficticios en producción.
9. Permitir reintentos sin duplicar oportunidades ni matches.

## Estado

El núcleo RADAR/matching sigue sólido a nivel de dominio, pero la ruta Opportunity runtime tiene bloqueantes P0 que impiden considerar producción cerrada.

No se ejecutaron tests ni build por la estrategia acordada: primero completar correcciones estructurales y luego verificar dinámicamente.

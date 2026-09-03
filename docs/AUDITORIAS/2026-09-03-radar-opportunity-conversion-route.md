# Auditoría RADAR — extracción del handler HTTP de conversión

**Fecha:** 2026-09-03  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama:** `integration/conexa-unified`

## Objetivo

Reducir la lógica de negocio embebida en `server.ts` y preparar la integración del endpoint:

`POST /api/radar/opportunities/:opportunityId/create-request`

## Nuevo límite de arquitectura

Se creó `src/server/radar/radarOpportunityConversionRoute.ts`.

El handler HTTP ahora queda conceptualmente separado del dominio y de la persistencia:

1. autentica mediante `verifyAuthToken`;
2. extrae y normaliza parámetros HTTP;
3. delega la conversión a `createServiceRequestFromRadarOpportunity`;
4. traduce errores conocidos a códigos HTTP;
5. no contiene acceso directo a Firestore ni creación de `ServiceRequest`.

El servicio de conversión conserva la transacción Firestore, la selección desde `radar_candidates`, las validaciones y la idempotencia.

## Integración pendiente

El monolito `server.ts` todavía contiene el handler legacy. No se modificó en esta etapa porque es un archivo de aproximadamente 154 KB y una sustitución completa vía API de contenidos introduce un riesgo innecesario de truncamiento.

La integración final deberá reemplazar únicamente el cuerpo legacy por una delegación al handler extraído, preservando el path público actual.

## Estado

Arquitectura preparada para una integración quirúrgica del runtime. No se ejecutaron tests ni build.

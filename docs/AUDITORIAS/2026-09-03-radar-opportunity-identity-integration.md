# Auditoría RADAR — integración de identidad

**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama:** `integration/conexa-unified`  
**Fecha:** 2026-09-03

## Corrección aplicada

`radarOpportunityService.ts` ahora consume `radarOpportunityIdentity.ts` para resolver una identidad documental común.

La lectura de una oportunidad intenta, en este orden:

1. ID canónico `RAD-<sha256(sourceType:externalReference)>` cuando existe referencia externa;
2. ID generado por la implementación anterior de `radarOpportunityService`;
3. ID histórico `RADAR-<sha256(externalReference)>`.

Para oportunidades nuevas se utiliza el ID canónico.

## Objetivo

Evitar que la consolidación de las capas RADAR cree duplicados o pierda acceso a documentos generados por las implementaciones anteriores.

No se renombran documentos históricos automáticamente.

## Estado arquitectónico

La frontera `radarOpportunityPersistenceBoundary.ts` también adopta esta estrategia y deja de tratar el ID histórico como única identidad. Las capas antiguas siguen existiendo temporalmente porque todavía hay consumidores en `server.ts` que deben migrarse.

La eliminación de las implementaciones redundantes queda bloqueada hasta completar la migración de consumidores y verificar referencias de ID.

## Verificación

No se ejecutaron tests ni build. La verificación dinámica permanece para la fase final.

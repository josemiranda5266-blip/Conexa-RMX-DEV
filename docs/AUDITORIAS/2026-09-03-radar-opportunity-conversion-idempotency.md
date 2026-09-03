# Auditoría RADAR — idempotencia de conversión a ServiceRequest

**Fecha:** 2026-09-03  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama definitiva:** `integration/conexa-unified`

## Hallazgo

El servicio `src/server/radar/radarOpportunityConversionService.ts` ya utilizaba IDs deterministas para `service_requests` y una transacción Firestore, pero una segunda solicitud sobre una oportunidad que ya estuviera en `SERVICE_REQUESTED` o `CONVERTED` podía ser rechazada por el estado antes de alcanzar la lógica de idempotencia.

Además, volver a validar disponibilidad/verificación del profesional en un retry exitoso era innecesario y podía convertir una operación ya completada en un falso error si el estado actual del profesional había cambiado.

## Corrección

La conversión ahora trata `SERVICE_REQUESTED` y `CONVERTED` como estados de retry idempotente:

1. exige que exista `serviceRequestId` en la oportunidad;
2. recupera el `service_requests/{serviceRequestId}` asociado dentro de la misma transacción;
3. verifica que la solicitud pertenece a la oportunidad y al cliente autenticado;
4. devuelve la solicitud existente con `created: false` sin mutar la oportunidad.

Si el estado `SERVICE_REQUESTED`/`CONVERTED` carece de solicitud asociada, el servicio falla explícitamente como inconsistencia de datos en lugar de crear una solicitud nueva.

Las oportunidades `REGISTERED` y `MATCHED` mantienen el flujo normal: selección del profesional desde `radar_candidates`, validaciones de seguridad, creación determinista de `ServiceRequest` y transición atómica a `SERVICE_REQUESTED`.

## Resultado arquitectónico

La operación RADAR → ServiceRequest queda definida como una operación idempotente y reintentable, reduciendo el riesgo de duplicados y evitando que un retry dependa del estado mutable actual del profesional.

## Estado de verificación

No se ejecutaron tests ni build por la regla vigente de posponer la verificación final hasta terminar las correcciones estructurales.

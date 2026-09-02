# Auditoría comercial — 2026-09-02

## Rama auditada

- Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
- Rama: `integration/conexa-unified`
- Punto de revisión: rama vigente al 2026-09-02

## Flujo revisado

`service_request → quote → transaction → Mercado Pago → job start → job complete → review → settlement`

## Controles confirmados

- La identidad del cliente y profesional se deriva del Firebase ID token y de documentos Firestore autoritativos.
- La creación de la transacción calcula importe, comisión y neto en backend; el navegador no define la comisión.
- La contratación valida propietario de la solicitud, estado contractual, presupuesto pendiente, capacidad profesional y conexión de Mercado Pago.
- El inicio del trabajo exige transacción `PAID`, presupuesto `ACCEPTED` y coincidencia del profesional autenticado.
- La finalización exige `IN_PROGRESS`/`SERVICE_IN_PROGRESS` y vuelve a comprobar las relaciones entre solicitud, presupuesto y transacción dentro de una transacción Firestore.
- La reseña es idempotente por `serviceRequestId + clientId` y cierra el trabajo junto con el estado `SETTLED`.
- El webhook de Mercado Pago no confía en el redirect del navegador y recupera el pago servidor-a-servidor usando el token del profesional conectado.

## Hallazgos corregidos por automatización del repositorio

El endpoint de conversión RADAR contenía una mutación tipográfica en la normalización de `estimatedBudgetArs` (`Numer(...)`). El workflow `radar-fix4.yml` está diseñado para corregir automáticamente ese caso en cada push de un actor no bot. La corrección debe quedar aplicada por el commit automático posterior a esta auditoría.

## Riesgos todavía bajo revisión

1. La búsqueda de transacciones por `serviceRequestId` con `limit(1)` en operaciones de inicio/completado depende de que el modelo garantice una única transacción comercial activa por solicitud.
2. El webhook debe mantener una única relación inequívoca entre `external_reference`, `transaction.id`, `quoteId` y `serviceRequestId`.
3. Estados de reembolso/chargeback deben impedir cualquier continuación del servicio si el pago ya fue revertido.
4. La sincronización de reseñas en frontend debe distinguir reseñas authored-by-client de reseñas recibidas por el profesional, evitando listeners globales innecesarios.

## Criterio de salida

No se ejecutan builds ni tests en esta etapa, por instrucción operativa. La verificación final se realizará cuando termine la fase de correcciones estructurales.
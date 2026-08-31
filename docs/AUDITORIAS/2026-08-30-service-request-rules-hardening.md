# Auditoría — ServiceRequest Rules Hardening

## Fecha
2026-08-30

## Repositorio objetivo
josemiranda5266-blip/Conexa-RMX-DEV

## Rama
integration/conexa-unified

## Corrección
Se restringieron las actualizaciones directas del cliente sobre `service_requests` a una whitelist de campos editables y únicamente mientras el request permanece en `REQUEST_CREATED`.

Campos editables por cliente:
- title
- category
- professionName
- description
- approxLocation
- preferredDate
- preferredTimeSlot
- estimatedBudgetArs
- urgency
- images
- updatedAt

Se mantienen fuera de esa whitelist los campos autoritativos/comerciales como `status`, `assignedProfessionalId`, `biddingProfessionalIds` y `discoveryMode`.

## Resultado
El cliente ya no puede modificar arbitrariamente un ServiceRequest después de que el flujo comercial haya avanzado a `QUOTES_RECEIVED` o posteriores.

## Commit funcional
2b768de0607d060bcca896d63ebb039dc7fd4ab4

## Verificación
No se ejecutaron tests. La verificación dinámica queda para la fase final acordada.

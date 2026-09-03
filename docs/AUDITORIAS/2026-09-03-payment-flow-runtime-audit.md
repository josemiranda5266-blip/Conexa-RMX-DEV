# Auditoría — flujo runtime de pago

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Verificación

Repositorio y rama definitivos verificados antes de la auditoría.

## Flujo observado

La ruta `/api/transactions/create` ya aplica varias garantías importantes:

- el cliente se obtiene del token autenticado;
- el quote se vuelve a leer desde Firestore;
- el request se valida contra el cliente;
- el profesional se valida contra el quote;
- la conexión Mercado Pago del profesional debe existir;
- la transacción se crea en `PAYMENT_PENDING`;
- quote y service request pasan a `ACCEPTED` / `PROFESSIONAL_SELECTED` en la misma transacción Firestore. fileciteturn1214file0

La ruta `/api/jobs/start` exige simultáneamente:

- request `PROFESSIONAL_SELECTED`;
- transaction `PAID`;
- quote `ACCEPTED`;
- profesional autenticado coincidente.

Entonces mueve request a `IN_PROGRESS` y transaction a `SERVICE_IN_PROGRESS`. fileciteturn1214file0

La finalización exige `IN_PROGRESS` + `SERVICE_IN_PROGRESS` y mueve los estados a `REVIEW_PENDING` + `SERVICE_COMPLETED`. fileciteturn1214file0

## Hallazgo P0

El puente entre `PAYMENT_PENDING` y `PAID` depende del webhook de Mercado Pago. El webhook realiza validación de firma cuando existe `MP_WEBHOOK_SECRET`, recupera el pago server-to-server con el token del profesional y compara `external_reference` y monto antes de actualizar la transacción. fileciteturn1215file0

Esto es correcto como principio de seguridad.

Pero el webhook actualmente devuelve HTTP 200 incluso ante errores internos después de capturar la excepción. Eso puede impedir que Mercado Pago reintente una notificación cuyo procesamiento interno falló. Por tanto, la resiliencia del consumidor de webhook aún no está cerrada para producción.

## Hallazgo P1

Los estados `REFUNDED` y `CHARGEBACK` pueden afectar transacciones que ya avanzaron en el ciclo comercial. Esto puede ser válido, pero debe existir una política explícita de compensación/rollback financiero y de bloqueo de liquidación, no solamente una escritura de estado.

## Conclusión

El flujo comercial previo al pago está razonablemente protegido. La principal deuda pendiente es convertir el webhook en un consumidor durable: idempotencia explícita por evento/paymentId, registro del evento recibido, resultado de procesamiento, reintentos seguros y respuesta HTTP que no confirme procesamiento exitoso cuando hubo una falla interna.

No se ejecutaron tests ni build.

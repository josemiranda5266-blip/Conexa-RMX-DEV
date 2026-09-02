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
- Los estados de autorización y verificación no se delegan a escrituras directas del navegador: las mutaciones administrativas pasan por backend y las reglas Firestore bloquean las escrituras de autoridad desde el cliente.

## Correcciones realizadas en esta fase

- Se eliminaron los workflows temporales de parcheo automático de RADAR y AppContext. Esos workflows habían introducido mutaciones repetidas en `server.ts` y ya no forman parte del repositorio operativo.
- Se restauró el bloque de conversión RADAR a una versión consistente: candidatos, urgencia, presupuesto y mapa de códigos HTTP utilizan nombres válidos y coherentes.
- Se mantuvo la conversión RADAR dentro de una transacción Firestore, con validación del propietario, estado convertible, consentimiento, reutilización idempotente de una solicitud ya vinculada y filtrado de candidatos válidos/no bloqueados.

## Riesgos todavía bajo revisión

1. La búsqueda de transacciones por `serviceRequestId` con `limit(1)` en operaciones de inicio/completado depende de que el modelo garantice una única transacción comercial activa por solicitud. El modelo actual reutiliza el documento determinista `txn-{quoteId}`, pero conviene formalizar esa unicidad como invariantes del dominio.
2. El webhook debe mantener una única relación inequívoca entre `external_reference`, `transaction.id`, `quoteId` y `serviceRequestId`.
3. Un pago `REFUNDED` o `CANCELLED` debe impedir cualquier continuación del servicio; el backend actual protege el inicio mediante estado `PAID`, pero el comportamiento ante eventos tardíos del proveedor debe conservarse idempotente.
4. La sincronización de reseñas en frontend distingue actualmente las reseñas authored-by-client; debe verificarse que las pantallas de perfil profesional no dependan de una colección global de reseñas para mostrar las recibidas.
5. `users` sigue siendo una colección de directorio global para usuarios autenticados. Antes de producción a escala conviene separar explícitamente perfil público y datos de sesión/privados para reducir superficie de lectura.

## Criterio de salida

No se ejecutan builds ni tests en esta etapa, por instrucción operativa. La verificación final se realizará cuando termine la fase de correcciones estructurales.
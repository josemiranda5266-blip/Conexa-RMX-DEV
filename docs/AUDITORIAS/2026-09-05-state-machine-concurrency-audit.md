# Auditoría de máquina de estados y concurrencia — 2026-09-05

## Alcance

Revisión de los invariantes de producción del flujo Nexora: cancelación, reservas de inventario, settlement, refund, chargeback y consumo de eventos.

## Hallazgos corregidos

### 1. Cancelación vs reserva de inventario

La cancelación podía restaurar stock aunque `reservedByOrderId` ya hubiera sido eliminado por el worker de expiración o por otro flujo. Eso podía duplicar inventario.

Corrección aplicada en `apps/api-nexora/src/repositories.ts`:

- solo se restaura stock cuando `reservedByOrderId === orderId`;
- una reserva ya liberada/consumida no vuelve a incrementar stock;
- listings eliminados se ignoran de forma segura;
- el `paymentTransaction` vinculado se lee dentro de la misma transacción;
- si el payment ya no está en `PAYMENT_PENDING`, la cancelación es rechazada;
- una segunda cancelación concurrente observa `CANCELLED` y es idempotente.

Commit: `5cc7fd954f16e45f37a612efe26a98c1960d6243`.

### 2. Outbox: evento de completion frente a cambio posterior de estado

El consumer `NEXORA_ORDER_COMPLETED` verificaba que el evento siguiera `PENDING`, pero no verificaba el estado actual de la orden. Un evento emitido antes de una cancelación podía crear una instalación sobre una orden ya cancelada.

Corrección aplicada en `apps/api-conexa/src/eventConsumer.ts`:

- lee la orden dentro de la misma transacción del consumer;
- exige `orders/{orderId}.status === COMPLETED`;
- verifica que `buyerId === event.userId`;
- exige que orden y evento requieran instalación;
- eventos obsoletos se marcan `PUBLISHED` sin ejecutar side effects;
- se conserva la idempotencia por `installationLeads/{orderId}`.

Commit: `15746000ef305b08af11d3cf4862b20782f0a837`.

## Invariantes actualmente cubiertos

- `PENDING -> CANCELLED` solo mientras el payment vinculado permanezca `PAYMENT_PENDING`.
- `PAID` no puede ser cancelado por el endpoint normal.
- settlement concurrente con cancelación queda resuelto por la transacción: el primero que consolida el estado gana y el segundo reevalúa el estado actual.
- una reserva solo se libera una vez.
- una listing eliminada no bloquea la cancelación del pedido.
- `COMPLETED` conserva la consolidación de inventario aunque exista un refund financiero posterior.
- refund y chargeback utilizan claves deterministas de reversión y estados terminales para impedir una doble reversión.
- un evento de completion no genera efectos si la orden ya no está `COMPLETED`.

## Pendientes para la siguiente pasada

1. Verificación exhaustiva de todos los webhooks repetidos/concurrentes contra las transacciones Firestore.
2. Revisión final de todos los consumidores de outbox y sus estados terminales.
3. Comparación sistemática de todos los grafos de estado declarados con las transiciones efectivamente implementadas.
4. Batería de build/tests al finalizar las correcciones estructurales; todavía no se ejecuta en esta etapa para respetar el orden de auditoría acordado.

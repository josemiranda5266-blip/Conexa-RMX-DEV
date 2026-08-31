# CONEXA RMX — Primera fase comercial

## Objetivo
Convertir la aceptación de un presupuesto en una contratación económica trazable, con comisión calculada exclusivamente en backend y preparada para Mercado Pago Split.

## Cambios implementados
- Nuevo modelo `Transaction` y colección Firestore `transactions`.
- Endpoint autenticado `POST /api/transactions/create`.
- La aceptación de un presupuesto autenticado crea una transacción con estado `PAYMENT_PENDING`.
- La comisión de CONEXA se calcula en servidor mediante `CONEXA_PLATFORM_FEE_PERCENT` (8% por defecto; máximo 20%).
- El cliente ya no puede aceptar directamente un presupuesto mediante `updateDoc`; la aceptación comercial pasa por el backend.
- Reglas Firestore para impedir que el cliente escriba/modifique/elimine transacciones.
- Reglas de invitaciones y configuración beta restringidas a administradores.
- Endpoints Gemini requieren autenticación Firebase válida.
- Webhook Meta: eliminado secreto fallback hardcodeado.
- Webhook Meta: validación HMAC sobre el `rawBody` original y comparación `timingSafeEqual`.
- `.env.example` actualizado con `CONEXA_PLATFORM_FEE_PERCENT=8`.

## Importante
Esta fase NO procesa todavía dinero real. `PAYMENT_PENDING` significa que la contratación económica fue creada y está lista para conectar Checkout/Split de Mercado Pago.

## Validación
No se pudo ejecutar `npm install`/`npm run build` en este entorno porque la instalación de dependencias excedió el tiempo disponible. `tsc --noEmit` fue ejecutado, pero devolvió errores de módulos ausentes (`node_modules` no instalado), no errores funcionales verificables del proyecto.

## Próxima fase
1. OAuth Mercado Pago para profesionales.
2. Creación de Checkout/Split 1:1.
3. Webhooks de pago idempotentes.
4. Actualización segura de `transactions.status`.
5. Panel financiero ADMIN.
6. Conciliación, reembolsos y chargebacks.

## Fase 2 — Mercado Pago Marketplace (OAuth + Checkout Pro)
- Implementado flujo OAuth para que profesionales conecten su propia cuenta de Mercado Pago sin compartir credenciales.
- Access/refresh tokens se almacenan cifrados con AES-256-GCM en Firestore; nunca se exponen al navegador.
- Endpoint de estado y desconexión para la cuenta del profesional.
- Implementado endpoint de creación de Checkout Pro para una `transaction` existente.
- `marketplace_fee` se toma exclusivamente del ledger server-side.
- Implementado webhook server-side: el estado de pago se confirma consultando Mercado Pago, nunca por el redirect del navegador.
- Añadida validación HMAC opcional del webhook mediante `MP_WEBHOOK_SECRET`.
- Añadidas variables de entorno/Secrets requeridas para OAuth y cifrado.

**Importante:** antes de producción hay que probar el flujo completo con cuentas de prueba de Mercado Pago, configurar Redirect URL y Webhook URL en "Tus integraciones", y validar reembolsos/conciliación. La documentación oficial confirma que Split 1:1 requiere OAuth por vendedor y admite Checkout Pro/Checkout API. 


### Regla comercial añadida
- Un presupuesto no puede convertirse en contratación pagable si el profesional no tiene Mercado Pago vinculado y activo. Esto evita crear contratos que luego no puedan cobrarse mediante Split 1:1.
- La interfaz del profesional incorpora el acceso `Conectar Mercado Pago`.
- La aceptación del presupuesto intenta crear el checkout después de crear la transacción; si el profesional no está conectado, se bloquea con un estado explícito.


## Auditoría de continuidad — Fase 2 Marketplace

La auditoría del código actual detectó una divergencia entre la documentación comercial y el árbol activo de la rama unificada.

- La documentación declara implementados OAuth, Checkout Pro y webhook de Mercado Pago.
- El árbol activo contiene la configuración y parte de la frontera comercial, pero las búsquedas y el inventario de archivos disponibles no localizaron los módulos/rutas activas que materialicen el checkout y la confirmación de pago.
- Por lo tanto, la integración debe considerarse **incompleta o parcialmente migrada** hasta recuperar o reimplementar en la rama activa:
  1. creación server-side del checkout para una Transaction;
  2. asociación persistida con la referencia externa del proveedor;
  3. webhook autenticado e idempotente;
  4. consulta server-side del estado real del pago;
  5. transición atómica PAYMENT_PENDING → PAID;
  6. registro de auditoría de confirmaciones repetidas.

Esta nota sustituye cualquier interpretación de que la documentación por sí sola pruebe la existencia operativa de esas rutas en la rama unificada.

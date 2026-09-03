# Auditoría — persistencia atómica del perfil profesional

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Corrección

`professionalProfileService.ts` fue endurecido para escribir `/users/{uid}` y `/public_professional_profiles/{uid}` dentro de una misma transacción de Firestore.

Esto elimina la ventana anterior en la que el usuario podía quedar actualizado y la proyección pública fallar después, dejando el directorio desincronizado.

La transacción también vuelve a leer el usuario dentro de la transacción antes de validar `isBlocked` y construir la proyección pública.

## Estado

La capa de servicio queda preparada para ser el único escritor HTTP del perfil profesional. El endpoint histórico de `server.ts` todavía no está conectado a esta capa.

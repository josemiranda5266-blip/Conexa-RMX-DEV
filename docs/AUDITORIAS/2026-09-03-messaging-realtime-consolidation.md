# Corrección — consolidación realtime de Messaging

**Fecha:** 2026-09-03
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`
**Rama:** `integration/conexa-unified`

## Corrección aplicada

Se integró `subscribeToConversationRealtime()` en `AppContext.tsx` como única fuente productiva de sincronización realtime para conversaciones y mensajes.

## Eliminado del flujo productivo

Se retiraron:

- la suscripción paralela basada en `subscribeToUserConversations()` dentro de AppContext;
- la reconstrucción local de Conversation mediante `users.find(...)`;
- los listeners históricos directos sobre `conversations`;
- los listeners históricos directos sobre `conversations/{id}/messages`.

## Arquitectura resultante

`AppContext → conversationRealtimeService → conversationService/public profiles → UI state`

La nueva ruta no necesita el arreglo global `users[]` para resolver participantes de conversaciones.

## Compatibilidad

`subscribeConversationMessages()` se mantiene temporalmente como método compatible sin crear listeners adicionales en producción. Esto evita que consumidores heredados reconstruyan un segundo grafo realtime.

## Impacto

- se elimina la doble fuente de verdad de Messaging en AppContext;
- se elimina la dependencia de `users[]` en el efecto productivo de conversaciones;
- la proyección de participantes queda basada en perfiles públicos;
- se reduce la cantidad de listeners duplicados.

## Pendientes

1. Revisar consumidores que dependían de crear listeners individuales mediante el método de compatibilidad.
2. Continuar la migración de otros consumidores de `users[]`.
3. Corregir el listener del usuario autenticado para aplicar `authenticatedUserProjection`.

No se ejecutaron tests ni build en esta etapa.

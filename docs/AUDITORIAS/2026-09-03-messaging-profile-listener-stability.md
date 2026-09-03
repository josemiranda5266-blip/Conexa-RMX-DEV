# Corrección — estabilidad del listener de perfiles en Messaging

**Fecha:** 2026-09-03  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama:** `integration/conexa-unified`

## Problema corregido

`conversationRealtimeService.ts` reconstruía la suscripción a perfiles públicos cada vez que cambiaba el snapshot de conversaciones.

Un mensaje nuevo actualiza metadatos como `lastMessageAt` y `updatedAt`, por lo que podía provocar recreaciones innecesarias del listener aunque los participantes fueran exactamente los mismos.

## Corrección

Se introdujo una clave determinística del conjunto de participantes:

`participantIds únicos → ordenados → join('|')`

La suscripción de perfiles solamente se reemplaza cuando esa clave cambia.

## Resultado

Los cambios frecuentes de metadata de conversaciones ya no generan churn innecesario sobre:

`subscribeToConversationParticipantProfiles()`

Esto reduce recreaciones de listeners y mantiene la topología realtime más estable.

## Pendiente principal

La mejora vive todavía en la nueva frontera `conversationRealtimeService`. Falta integrar esa frontera en `AppContext` y retirar la ruta histórica duplicada.

No se ejecutaron tests ni build durante esta etapa.

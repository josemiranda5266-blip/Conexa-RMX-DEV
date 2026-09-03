# Auditoría — inventario operativo de consumidores de users[] y doble sincronización

**Fecha:** 2026-09-03
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`
**Rama:** `integration/conexa-unified`

## Verificación previa

La auditoría se realizó sobre `integration/conexa-unified`.

## Hallazgos confirmados en AppContext

### 1. Messaging ya tiene dos rutas activas

Existe una ruta moderna basada en `subscribeToUserConversations()` y `subscribeToMessages()`.

También existe una ruta histórica dentro del efecto global que consulta directamente `conversations` con `array-contains` y crea listeners directos sobre `conversations/{id}/messages`.

Ambas rutas escriben en `conversations` y `messages`.

**Clasificación:** crítica de arquitectura y consumo realtime.

### 2. users[] todavía participa en la proyección de conversaciones

La función local histórica `toConversationView()` resuelve el participante con `users.find(...)`.

Además, la suscripción moderna depende de `[currentUser?.id, users]`, por lo que un cambio de usuarios puede recrear la suscripción de conversaciones.

Ya existen fronteras preparadas para sustituir esta dependencia:

- `conversationParticipantProfileService.ts`
- `conversationView.ts`
- `conversationRealtimeService.ts`

### 3. El bloque local de fallback sí necesita users[]

`createConversation()` usa `users.find(...)` solamente en el modo sin Firebase.

Este consumidor no debe confundirse con el flujo productivo Firestore. Su dependencia puede mantenerse aislada como compatibilidad de desarrollo/local.

### 4. activeMode todavía replica currentUser en users[]

`switchActiveMode()` actualiza `currentUser` y también hace `setUsers(...)`.

Esta duplicación es otro síntoma de que `users[]` cumple simultáneamente funciones de directorio, caché y estado local.

## Decisión de migración

El orden seguro es:

1. Integrar `conversationRealtimeService` como única fuente de Messaging.
2. Eliminar la ruta histórica de conversaciones y mensajes.
3. Sustituir `toConversationView` local por la proyección de dominio con perfiles públicos.
4. Quitar `users` de las dependencias de la suscripción de conversaciones.
5. Mantener temporalmente los consumidores exclusivos del fallback sin Firebase.
6. Continuar el inventario antes de retirar el listener global.

## Restricción

No se ejecutaron tests ni build durante esta etapa.

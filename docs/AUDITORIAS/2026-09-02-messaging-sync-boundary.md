# Auditoría — frontera de sincronización de Messaging

**Fecha:** 2026-09-02  
**Rama definitiva:** `integration/conexa-unified`  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`

## Verificación previa

Antes de esta auditoría se verificó el repositorio definitivo y la rama `integration/conexa-unified`.

## Hallazgo

`src/services/conversationService.ts` ya contiene la ruta estructurada para sincronizar conversaciones del usuario mediante `subscribeToUserConversations()`, filtrando por `participantIds` y ordenando por `updatedAt`. También contiene validaciones de integridad de participantes, `participantKey`, privacidad y mensajes.

Sin embargo, `AppContext.tsx` conserva lógica histórica adicional para Messaging y la construcción de la vista de conversación todavía depende del arreglo global `users`. Esto mantiene una dependencia indirecta del listener global de `/users`.

## Decisión arquitectónica

No se debe eliminar el listener global de `/users` todavía. Primero hay que migrar los consumidores restantes a servicios scoped/domain-specific. Para Messaging, la dirección correcta es:

`conversations` scoped al usuario → `participantIds` → `public_profiles` → vista de participante.

El servicio `subscribeToConversationParticipantProfiles()` ya existe y evita consultar `/users` para obtener los datos públicos del participante.

## Riesgo identificado

Mientras convivan la sincronización estructurada y la lógica histórica dentro de `AppContext`, existe riesgo de doble fuente de verdad, actualizaciones redundantes y dificultad para retirar el listener global.

## Próximo paso

Migrar `toConversationView` para recibir un mapa de perfiles públicos en lugar de resolver participantes desde `users`, y posteriormente eliminar la sincronización histórica duplicada cuando no existan otros consumidores que dependan de ella.

No se ejecutaron tests ni build, de acuerdo con la etapa actual del trabajo.

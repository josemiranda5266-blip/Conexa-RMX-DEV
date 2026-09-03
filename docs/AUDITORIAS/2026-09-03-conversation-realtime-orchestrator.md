# Auditoría — Orquestador realtime de conversaciones

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Hallazgo

`src/context/AppContext.tsx` mantiene un sincronizador directo de `conversations` y otro listener por conversación para `messages`, mientras el repositorio ya dispone de `conversationService` con las mismas responsabilidades. Esto deja dos fronteras realtime coexistiendo y dificulta migrar la presentación fuera de `/users`.

## Corrección estructural

Se agregó `src/services/conversationRealtimeService.ts` como orquestador único para el flujo de producción:

1. `subscribeToUserConversations()` obtiene únicamente conversaciones del usuario autenticado.
2. `subscribeToMessages()` gestiona los mensajes de cada conversación activa.
3. `subscribeToConversationParticipantProfiles()` obtiene únicamente perfiles públicos de los participantes.
4. `toConversationView()` construye la proyección consumible por UI sin consultar `/users`.

El orquestador también normaliza `Timestamp` de Firestore a `createdAt` string para respetar el contrato de `Message`, mantiene los listeners de mensajes por conversación y elimina listeners obsoletos cuando una conversación deja de pertenecer al conjunto activo.

## Estado de migración

La nueva frontera está creada y documentada, pero todavía no se elimina el sincronizador legado de `AppContext.tsx`. Esa integración requiere un reemplazo localizado y seguro del bloque monolítico para evitar pérdida accidental de contenido.

## Riesgos restantes

- `AppContext.tsx` todavía puede abrir listeners duplicados hasta completar la integración.
- El listener global `/users` continúa existiendo para otros consumidores.
- La eliminación del sincronizador legado debe hacerse después de conectar el nuevo orquestador al estado `conversations/messages`.

## Validación

No se ejecutaron tests ni build por decisión del plan de trabajo: la verificación dinámica se reserva para después de completar las correcciones estructurales.

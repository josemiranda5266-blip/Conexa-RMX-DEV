# Auditoría — 2026-09-03 — Revisión del orquestador realtime de conversaciones

## Repositorio y rama

- Repositorio definitivo: `josemiranda5266-blip/Conexa-RMX-DEV`
- Rama: `integration/conexa-unified`
- HEAD auditado: `69521fba4d341f9d1ea63e88f29c215b4dd0fd44`
- No se ejecutaron tests ni build.

## Hallazgo

La nueva frontera `src/services/conversationRealtimeService.ts` ya concentra la arquitectura prevista para mensajería: conversaciones persistidas, mensajes por conversación y perfiles públicos de participantes.

La integración con `AppContext.tsx` todavía no está aplicada. El contexto conserva un sincronizador paralelo que consulta directamente `conversations` y crea listeners de mensajes por conversación. Esto mantiene duplicación de responsabilidad hasta completar la migración.

## Revisión del orquestador

El orquestador evita volver a consultar `/users` para construir la vista de conversación y utiliza `toConversationView()` con `PublicUserProfile`.

El listener de perfiles debe estar desacoplado de los cambios de mensajes. Un mensaje modifica `lastMessageAt` y puede provocar una nueva emisión del listener de conversaciones; por ello la implementación debe reutilizar la suscripción de perfiles cuando el conjunto de participantes no cambió, en lugar de recrearla ante cada actualización de conversación.

## Decisión arquitectónica

La integración definitiva seguirá esta secuencia:

```text
AppContext
  -> subscribeToConversationRealtime()
      -> subscribeToUserConversations()
      -> subscribeToMessages() por conversación activa
      -> subscribeToConversationParticipantProfiles()
      -> toConversationView()
```

No se deben mantener simultáneamente dos grafos realtime de conversaciones en producción.

## Próximo paso

Realizar una migración localizada de `AppContext.tsx`, evitando reemplazos masivos del archivo monolítico:

1. importar `subscribeToConversationRealtime`;
2. conectar su estado a `setConversations` y `setMessages`;
3. retirar el sincronizador directo de conversaciones/mensajes;
4. conservar temporalmente `subscribeConversationMessages()` como API pública de compatibilidad si existen consumidores externos;
5. revisar después los listeners restantes de `AppContext` para continuar la reducción progresiva del God Context.

## Estado

- Orquestador: estructuralmente preparado.
- Vista de conversación: aislada de `/users`.
- Perfiles participantes: proyección pública.
- Duplicación en `AppContext`: pendiente de retirada.
- Tests/build: pendientes de la fase final de verificación.

# Auditoría — migración de participantes de conversaciones a perfiles públicos

Fecha: 2026-09-02
Rama: `integration/conexa-unified`

## Hallazgo

`AppContext.tsx` construía `Conversation.otherUser` resolviendo el participante mediante `users.find(...)`. En producción, `users` todavía se alimenta mediante un listener global sobre la colección privada `users`. Esto mezcla el directorio privado con la presentación de participantes de conversaciones y mantiene una dependencia arquitectónica innecesaria.

## Corrección preparada

Se agregó `src/services/conversationParticipantProfileService.ts`.

Este servicio:

- recibe únicamente IDs de participantes;
- reutiliza `subscribeToPublicProfiles`;
- transforma el resultado a un `Map<id, PublicUserProfile>`;
- nunca consulta `/users`;
- mantiene el límite/chunking de consultas de `public_profiles` existente;
- deja la migración de `AppContext` separada para evitar una modificación insegura del archivo monolítico sin su contenido completo verificable.

## Estado

La capa de resolución pública ya está aislada. La integración efectiva de `AppContext` todavía está pendiente: debe reemplazar `users.find(...)` en `toConversationView`, desacoplar el efecto de conversaciones del estado global `users` y, después, permitir eliminar el listener global de `/users` cuando los demás consumidores hayan sido migrados.

No se ejecutaron tests ni build, de acuerdo con la etapa actual de endurecimiento estructural.

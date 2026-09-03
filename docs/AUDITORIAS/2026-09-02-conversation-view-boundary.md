# Auditoría — frontera de vista de conversaciones

**Fecha:** 2026-09-02  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama:** `integration/conexa-unified`

## Verificación

Se verificó la rama `integration/conexa-unified` antes de la modificación. El HEAD resultante corresponde al commit que registra este documento.

## Hallazgo

`AppContext.tsx` construye la vista de una conversación mediante `users.find(...)`, vinculando la presentación de participantes con el listener global de `/users`.

La infraestructura de Messaging ya dispone de `StoredConversation` y de `subscribeToUserConversations()`, pero la proyección visual seguía acoplada al documento privado completo del usuario.

## Corrección estructural

Se creó `src/domain/conversationView.ts` con `toConversationView()`.

La función recibe exclusivamente:

- `StoredConversation` para los datos de conversación;
- `currentUserId` para resolver participante y unread count;
- `PublicUserProfile` opcional para los datos visibles del participante.

La función no recibe `UserProfile[]`, no consulta Firestore y no depende de `/users`.

## Resultado arquitectónico

La futura migración de AppContext puede reemplazar la dependencia:

`users.find(...)`

por:

`public profile map → toConversationView()`

sin modificar la representación de la conversación ni el servicio de persistencia.

El cambio es deliberadamente incremental. No se realizó todavía la edición masiva de `AppContext.tsx` porque el archivo sigue siendo monolítico y contiene múltiples sincronizadores que deben migrarse de forma coordinada.

## Pendientes

1. Integrar `toConversationView()` en AppContext.
2. Suscribir perfiles mediante `subscribeToConversationParticipantProfiles()`.
3. Eliminar la segunda fuente de sincronización de conversaciones.
4. Una vez migrados los demás consumidores, retirar progresivamente el listener global de `/users`.

No se ejecutaron tests ni build, de acuerdo con la etapa actual de la auditoría.

# Auditoría — inventario de sincronización de AppContext

**Fecha:** 2026-09-02  
**Repositorio:** `josemiranda5266-blip/Conexa-RMX-DEV`  
**Rama:** `integration/conexa-unified`

## Verificación

Se verificó nuevamente el repositorio definitivo y se inspeccionó `src/context/AppContext.tsx` directamente sobre `integration/conexa-unified`.

## Hallazgos principales

### 1. `/users` continúa siendo un listener global

AppContext mantiene `onSnapshot(collection(firestoreDb, 'users'), ...)` y carga todos los documentos en `users[]`. Esto es una dependencia central para descubrimiento, RADAR y otras funciones.

### 2. Messaging tiene doble fuente de sincronización

Existe una ruta estructurada mediante `subscribeToUserConversations(currentUser.id, ...)` y, dentro del sincronizador general, otra ruta que vuelve a consultar `conversations` y además abre listeners de mensajes por conversación. Ambas actualizan `conversations`/`messages`.

Esto debe consolidarse antes de retirar el listener global de `/users`.

### 3. El listener de usuario autenticado puede sobrescribir la identidad efectiva

El primer flujo de autenticación calcula una `effectiveRole` con protección para roles administrativos mediante claims. Sin embargo, el sincronizador posterior usa directamente el documento `/users/{uid}` para construir `updatedCurrentUser` y hace merge sobre `currentUser`. Ese segundo flujo no reaplica la política de autoridad de claims.

Riesgo: un cambio de rol privilegiado en Firestore, aunque no deba elevar privilegios según la política de autoridad, puede volver a introducir un valor de `role` en el estado del frontend por el listener posterior. Las Rules/backend siguen siendo la barrera real, pero el estado de UI puede quedar inconsistente con la identidad efectiva.

### 4. La duplicación de `onAuthStateChanged` aumenta el acoplamiento

AppContext registra listeners de autenticación separados para usuario actual, reseñas, solicitudes, presupuestos, conversaciones, moderación y transacciones. No es necesariamente incorrecto, pero multiplica ciclos de suscripción y hace más difícil garantizar que todos los dominios reaccionen al mismo estado de identidad.

## Decisión

No se realiza todavía una edición masiva de AppContext. El archivo es monolítico y una sustitución completa sin disponer de un patch seguro puede introducir regresiones o truncamiento.

La estrategia de refactorización queda definida como:

1. una única fuente de identidad efectiva;
2. servicios scoped por dominio;
3. Messaging basado en `conversationService` + `public_profiles`;
4. RADAR basado en `ProfessionalCandidate`;
5. eliminación progresiva del listener global de `/users`;
6. retirada de listeners duplicados una vez migrados sus consumidores.

## Estado

Este documento convierte la duplicación y el problema de autoridad del listener secundario en deuda técnica explícita y trazable. No se ejecutaron tests ni build.

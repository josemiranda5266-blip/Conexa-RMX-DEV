# Auditoría integral del repositorio Conexa — 2026-09-01

## Alcance

Repositorio canónico: `josemiranda5266-blip/Conexa-RMX-DEV`  
Rama: `integration/conexa-unified`

La auditoría cubrió estructura, contrato de datos, autorización, autenticación server-side, Firestore y metadatos/configuración del proyecto. No se ejecutaron tests ni se consideró la verificación manual como parte de esta fase.

## Correcciones aplicadas

### 1. Identidad del paquete

`package.json` todavía conservaba la identidad genérica `react-example` y versión `0.0.0`. Se normalizó a `conexa-rmx` y `1.0.0`.

### 2. Política de roles

`Role`/modelo de datos contemplaba `MODERATOR`, pero `normalizeRole()` no lo reconocía. Esto podía convertir un claim válido en `USER`. La política canónica ahora reconoce `MODERATOR` explícitamente.

### 3. Compatibilidad de autenticación del servidor

`server.ts` importaba `verifyUserAuthToken` pero utilizaba `verifyAuthToken(req)`. No existía el helper de una sola entrada utilizado por ese bootstrap. Se añadió una capa de compatibilidad segura en `src/server/auth.ts`, reutilizando la aplicación Admin ya inicializada o credenciales exclusivamente server-side.

### 4. Blueprint Firebase desactualizado

`firebase-blueprint.json` describía mensajes como colección top-level y declaraba un chat "encrypted" sin una implementación de cifrado de extremo a extremo demostrada en el contrato. Se alineó el blueprint con la estructura real `/conversations/{conversationId}/messages/{messageId}` y con el modelo de privacidad efectivo.

### 5. Matching: modo de UI no equivale a capacidad profesional

`activeMode: PROFESSIONAL` no debe convertir por sí solo a una cuenta en profesional elegible. La normalización ahora exige `hasProfessionalProfile`, `isProfessional` o el rol profesional legado. Esto evita que una preferencia de interfaz sea utilizada como autorización de dominio.

## Hallazgos que quedan para la siguiente fase

- `UserProfile` mantiene varias banderas de capacidad profesional (`role`, `activeMode`, `isProfessional`, `hasProfessionalProfile`) que deben terminar convergiendo en una autoridad de dominio única.
- La política exacta entre "perfil profesional existente" y "perfil profesional verificado" debe quedar expresada en una única regla reutilizada por UI, matching y operaciones sensibles.
- `AppContext` continúa concentrando demasiadas responsabilidades y debe dividirse por dominio sin romper persistencia.
- El flujo de verificación debe auditarse contra Firebase Storage y la política real de acceso/expiración de los documentos, ya que Firestore sólo protege el registro de verificación.
- Debe revisarse la coexistencia de `mercado_pago_connections` y `mercadopago_connections` para establecer una única colección canónica y retirar la legacy sólo después de confirmar referencias y datos.
- La deduplicación de oportunidades Radar basada únicamente en memoria de proceso debe migrarse a idempotencia persistente antes de producción multi-instancia.
- Debe verificarse que simulación Radar y producción permanezcan completamente separadas de matching, estadísticas y contacto real.
- `server.ts` sigue siendo un entrypoint monolítico; la extracción por módulos debe hacerse después de fijar contratos y dependencias, no como movimiento cosmético.

## Estado

**Auditoría estructural y correcciones de alta confianza: COMPLETADAS.**

**Verificación/build/tests: PENDIENTES INTENCIONALMENTE para la fase posterior.**

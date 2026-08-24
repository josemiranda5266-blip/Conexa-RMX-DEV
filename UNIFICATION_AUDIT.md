# CONEXA — Auditoría de unificación

Fecha de inicio: 2026-08-24

## Fuentes auditadas

### `Conxa.rmk`
Fuente funcional principal.

Hallazgos estructurales iniciales:
- El proyecto funcional está anidado en `Conxa.rmk-main/` dentro del repositorio.
- Contiene `server.ts` de aproximadamente 88 KB.
- Contiene `firestore.rules`, Firebase blueprint/configuración, frontend React y configuración de build.
- Su `package.json` usa React 19, Firebase 12, Express 4, Vite 6, TypeScript 5.8, Gemini SDK y Leaflet.

### `Conexa-remix`
Fuente secundaria para comparación.

Hallazgos estructurales iniciales:
- Contiene una aplicación completa en la raíz.
- `server.ts` es considerablemente menor (~29 KB).
- Contiene frontend, Firebase blueprint y `firestore.rules`.
- Comparte numerosos componentes con `Conxa.rmk`.
- No se copiará automáticamente: se recuperarán solamente funcionalidades que no estén presentes o que sean superiores tras auditoría.

### `Conexa-RMX-DEV`
Destino de la consolidación.

Estado inicial:
- Repositorio prácticamente vacío, con README inicial.
- Se creó la rama `unification/conexa-unified` para trabajar sin modificar la rama principal.

## Primera decisión arquitectónica

`Conxa.rmk` es la base funcional principal. `Conexa-remix` se utilizará como fuente de diferencias funcionales y no como segunda aplicación que deba coexistir.

## Duplicados estructurales detectados

1. `Conxa.rmk/Conxa.rmk-main/` contiene el proyecto real y debe quedar aplanado en la raíz del repositorio unificado.
2. `server.ts` existe en ambas aplicaciones y no deben coexistir dos servidores.
3. `package.json` y locks no deben duplicarse.
4. `firestore.rules` no debe duplicarse.
5. `firebase-blueprint.json` no debe duplicarse.
6. Los componentes compartidos entre ambas aplicaciones deben tener una sola implementación canónica.

## Criterio de seguridad

Antes de aceptar un módulo se debe comprobar:
- autenticación real;
- autorización server-side;
- consistencia de estados;
- ausencia de secretos;
- compatibilidad con Firebase actual;
- compatibilidad con Mercado Pago;
- ausencia de fallback de producción que pueda convertir una operación real en una operación local.

## Hallazgos ya identificados en la base principal

- No debe usarse `activeMode` como mecanismo de autorización.
- Un profesional nuevo no debe recibir artificialmente `rating = 5.0`.
- Los endpoints críticos deben validar identidad, rol, pertenencia y transición de estado en backend.
- Las Firestore Rules deben impedir escalada de privilegios desde documentos de usuario.
- La implementación de `Conexa-remix` para eliminación de cuenta requiere rechazo/reimplementación si no existe autenticación real y borrado real en backend.

## Próxima fase

1. Consolidar estructura raíz.
2. Incorporar archivos base de `Conxa.rmk`.
3. Comparar módulo por módulo contra `Conexa-remix`.
4. Incorporar únicamente diferencias funcionales validadas.
5. Eliminar duplicados y artefactos.
6. Ejecutar auditoría de seguridad y build.
7. Recién después considerar merge a `main`.

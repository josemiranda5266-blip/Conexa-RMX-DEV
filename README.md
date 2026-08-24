# CONEXA — Unified Repository

Repositorio canónico de CONEXA RMX.

## Estrategia de unificación

Este repositorio se está construyendo a partir de:

- `josemiranda5266-blip/Conxa.rmk` — fuente funcional principal y más evolucionada.
- `josemiranda5266-blip/Conexa-remix` — fuente de comparación y recuperación selectiva de funcionalidades.
- `josemiranda5266-blip/Conexa-RMX-DEV` — destino del repositorio unificado.

### Regla de integración

No se realiza un merge ciego. Cada archivo/módulo se clasifica como:

- **KEEP** — conservar la implementación más completa y segura.
- **MERGE** — combinar funcionalidades no redundantes.
- **REPLACE** — reemplazar una implementación inferior por otra superior.
- **DROP_DUPLICATE** — eliminar duplicados sin pérdida funcional.
- **DROP_OBSOLETE** — eliminar código obsoleto, demo o inseguro.
- **REVIEW** — requiere auditoría adicional antes de incorporarse.

La rama `unification/conexa-unified` es la rama de trabajo de esta consolidación. No se considera producción hasta completar auditoría, build y pruebas.

## Arquitectura objetivo

```text
CONEXA
├── React + TypeScript + Vite
├── Express backend
├── Firebase Auth / Firestore
├── Mercado Pago
├── Gemini AI
└── Radar
```

## Principios

1. Una sola fuente canónica para cada módulo.
2. Ninguna duplicación de `src`, `server.ts`, reglas o configuración Firebase.
3. Las operaciones críticas pasan por backend/autorización server-side.
4. Los secretos nunca se incorporan al repositorio.
5. `activeMode` no debe utilizarse como autorización.
6. El estado de negocio debe tener una única fuente canónica.

## Estado

**UNIFICACIÓN EN PROGRESO — NO PRODUCTION READY.**

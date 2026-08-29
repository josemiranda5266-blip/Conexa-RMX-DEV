# CONEXA — Registro de auditorías y avances

Esta carpeta es el registro permanente del trabajo de auditoría, correcciones, seguridad y preparación para producción de CONEXA.

## Fuente de trabajo actual

- Repositorio: `Conexa-RMX-DEV`
- Rama de consolidación: `integration/conexa-unified`
- Estrategia: consolidar aquí lo mejor de los repositorios anteriores sin hacer merges ciegos.
- `main` no se modifica durante la consolidación.

## Flujo oficial

1. Auditar
2. Corregir
3. Seguridad
4. Producción
5. Primeros usuarios
6. Primeros profesionales pagos
7. Escalar

## Documentos

- `docs/CONEXA_UNIFIED_SECURITY_PLAN.md`: arquitectura y requisitos de seguridad de la consolidación.
- `docs/AUDITORIAS/AUDITORIA-2026-08-29.md`: auditoría inicial registrada el 29/08/2026.
- `docs/AUDITORIAS/CHANGELOG-AUDITORIAS.md`: historial breve de auditorías y correcciones.

## Regla de mantenimiento

Cada nueva auditoría importante debe registrar: fecha, rama, commit auditado, hallazgos, severidad, correcciones aplicadas, pruebas ejecutadas y pendientes. No se debe declarar producción lista sin verificar build, lint, pruebas críticas, reglas Firestore, autorización por recurso y flujo comercial completo.

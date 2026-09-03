# Reviews — hardening de agregados de reputación

Fecha: 2026-09-03
Rama: `integration/conexa-unified`

## Corrección aplicada

Se corrigió `src/server/reviewService.ts`, eliminando declaraciones duplicadas introducidas durante la consolidación del flujo de reputación. El archivo tenía identificadores repetidos para colecciones y referencias Firestore, lo que impedía la compilación TypeScript.

## Estado funcional del servicio

La creación autoritativa de una reseña mantiene en una misma transacción la creación idempotente, la actualización de `rating` y `reviewCount`, la sincronización de la proyección pública y RADAR, el cierre del estado de review y la transición financiera cuando corresponde.

## Pendientes

- cablear `reviewRoute` en el runtime principal;
- sustituir el escritor legacy de `AppContext`;
- verificar el contrato exacto de estados comerciales y financieros antes de considerar cerrado el dominio.

No se ejecutaron tests ni build en esta fase.
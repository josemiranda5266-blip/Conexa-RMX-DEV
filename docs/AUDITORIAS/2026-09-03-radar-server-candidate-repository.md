# Auditoría RADAR — fuente server-side de candidatos

Fecha: 2026-09-03
Repositorio: `josemiranda5266-blip/Conexa-RMX-DEV`
Rama: `integration/conexa-unified`

## Avance

Se creó `src/server/radar/radarCandidateRepository.ts` como frontera server-side para obtener candidatos RADAR.

El repositorio:

- usa `getAdminDb()`, respetando el Firestore database ID configurado;
- limita la lectura a 500 documentos;
- convierte cada documento a `RadarCandidate` mediante `toRadarCandidate()`;
- no devuelve el `UserProfile` privado al consumidor;
- preserva `trustScore`, necesario para el ranking, sin convertirlo en dato público.

## Decisión arquitectónica

La fuente física sigue siendo la colección `users` en esta fase, pero el matching ya no necesita conocer ni transportar el documento privado completo. Esto permite sustituir posteriormente la lectura por una proyección dedicada/indexada sin cambiar el contrato del matcher.

La integración con las rutas de `server.ts` queda pendiente porque ese archivo es de gran tamaño y requiere una modificación segura de contenido completo o un mecanismo de patch confiable. No se debe duplicar una segunda ruta de matching para evitar divergencia.

## Estado

RADAR/matching: avance estructural hacia una fuente backend acotada.

## Verificación

No se ejecutaron tests ni build.

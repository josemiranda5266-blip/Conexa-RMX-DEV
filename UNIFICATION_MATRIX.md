# Matriz de comparación — Conxa.rmk vs Conexa-remix

## Implementaciones con evidencia de identidad exacta

Los siguientes archivos aparecen con el mismo SHA en ambas fuentes y, por tanto, son duplicados reales que no necesitan dos copias:

| Archivo | SHA observado | Decisión |
|---|---|---|
| `BecomeProfessionalModal.tsx` | `c0645c3...` | una sola copia |
| `ChatWindow.tsx` | `956e0f3...` | una sola copia |
| `FeedbackModal.tsx` | `35de03d...` | una sola copia |
| `MapComponent.tsx` | `ca5bba8...` | una sola copia |
| `OnboardingModal.tsx` | `a903ed9...` | una sola copia |
| `PrivacyBanner.tsx` | `aa885c0...` | una sola copia |
| `ProfessionalCard.tsx` | `bef926fa...` | una sola copia |
| `ProfessionalDetailModal.tsx` | `fdafb350...` | una sola copia |
| `QuoteModal.tsx` | `70dcb455...` | una sola copia |

## Archivos que NO son duplicados exactos y requieren comparación funcional

| Archivo | Observación | Decisión provisional |
|---|---|---|
| `server.ts` | ~88 KB en Conxa.rmk vs ~29 KB en Conexa-remix | usar Conxa.rmk como base; recuperar diferencias útiles selectivamente |
| `firestore.rules` | reglas distintas | usar diseño más completo de Conxa.rmk, pero endurecido para evitar escalada de privilegios |
| `AdminPanel.tsx` | tamaños/SHA diferentes | comparar funcionalidad antes de elegir |
| `Header.tsx` | tamaños/SHA diferentes | comparar funcionalidad |
| `RequestsList.tsx` | tamaños/SHA diferentes | comparar funcionalidad |
| `App.tsx` | tamaños/SHA diferentes | comparar rutas/estado global antes de elegir |
| `package.json` | manifiestos diferentes | consolidar dependencias y eliminar duplicados |
| `firebase-blueprint.json` | mismo modelo base observado | una sola versión canónica |

## Diferencias de seguridad relevantes

### `Conxa.rmk`
- Tiene verificación de Firebase Admin en backend.
- Tiene sanitización PII antes de Gemini.
- Tiene rate limiting.
- Tiene middleware/endpoint de autenticación más desarrollado.
- Tiene OAuth de Mercado Pago más desarrollado.
- Tiene operaciones críticas orientadas a backend.

### `Conexa-remix`
- Su `/api/gemini/*` no muestra la misma exigencia de autenticación que la versión principal.
- El endpoint `/api/user/delete-account` contiene una respuesta simulada y declara que la autenticación de producción debe implementarse; no debe incorporarse tal cual.
- Sus Firestore Rules son más permisivas en usuarios, solicitudes, quotes, conversaciones y mensajes.

## Regla de consolidación

No se conservarán dos implementaciones equivalentes. Cuando exista una diferencia, se seleccionará la implementación que aporte mayor cobertura funcional y seguridad, y se migrarán solamente las piezas adicionales que no sean redundantes.

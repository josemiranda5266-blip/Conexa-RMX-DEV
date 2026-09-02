from pathlib import Path

path = Path('server.ts')
text = path.read_text(encoding='utf-8')
marker = "  app.post('/api/admin/verifications/:verificationId/approve', rateLimiter, async (req: Request, res: Response) => {"
if "app.get('/api/admin/verifications/:verificationId/document-url'" in text:
    raise SystemExit('VERIFICATION_DOCUMENT_ROUTE_ALREADY_PRESENT')
if marker not in text:
    raise SystemExit('ADMIN_VERIFICATION_APPROVE_ROUTE_MARKER_NOT_FOUND')
route = r'''  app.get('/api/admin/verifications/:verificationId/document-url', rateLimiter, async (req: Request, res: Response) => {
    try {
      const adminIdentity = await requireAdminRequest(req, res);
      if (!adminIdentity) return;

      const app = getFirebaseAdmin();
      if (!app) {
        res.status(503).json({ success: false, error: 'Firebase Admin no está configurado.', code: 'FIREBASE_ADMIN_NOT_CONFIGURED' });
        return;
      }

      const db = getAdminFirestore(app);
      const verificationId = req.params.verificationId;
      const verificationSnapshot = await db.collection('verifications').doc(verificationId).get();
      if (!verificationSnapshot.exists) {
        res.status(404).json({ success: false, error: 'No se encontró la verificación.', code: 'VERIFICATION_NOT_FOUND' });
        return;
      }

      const verification = verificationSnapshot.data() || {};
      const documentPath = typeof verification.documentPath === 'string' ? verification.documentPath : '';
      const userId = typeof verification.userId === 'string' ? verification.userId : '';
      if (!documentPath || !userId || !documentPath.startsWith(`verification-documents/${userId}/`)) {
        res.status(409).json({ success: false, error: 'La verificación no contiene una referencia privada válida.', code: 'INVALID_VERIFICATION_DOCUMENT_PATH' });
        return;
      }

      const bucket = getAdminStorage(app).bucket();
      const file = bucket.file(documentPath);
      const [metadata] = await file.getMetadata();
      const contentType = String(metadata.contentType || '').toLowerCase();
      if (!new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']).has(contentType)) {
        res.status(409).json({ success: false, error: 'El documento almacenado no es de un tipo permitido.', code: 'INVALID_VERIFICATION_DOCUMENT_TYPE' });
        return;
      }

      const expiresAt = Date.now() + 10 * 60 * 1000;
      const [url] = await file.getSignedUrl({ version: 'v4', action: 'read', expires: expiresAt });
      res.json({ success: true, url, expiresAt });
    } catch (err: any) {
      console.error('[CONEXA VERIFICATION] Error generando acceso administrativo temporal al documento:', err);
      res.status(500).json({ success: false, error: 'No se pudo generar el acceso temporal al documento.', code: err?.message || 'VERIFICATION_DOCUMENT_URL_ERROR' });
    }
  });

'''
text = text.replace(marker, route + marker, 1)
path.write_text(text, encoding='utf-8')

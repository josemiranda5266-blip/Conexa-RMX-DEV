from pathlib import Path
import re

SERVER = Path('server.ts')
MODAL = Path('src/components/BecomeProfessionalModal.tsx')
CTX = Path('src/context/AppContext.tsx')

server = SERVER.read_text(encoding='utf-8')

# Add Admin Storage import once.
if 'from "firebase-admin/storage"' not in server:
    marker = 'import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";\n'
    replacement = marker + 'import { getStorage as getAdminStorage } from "firebase-admin/storage";\n'
    if marker not in server:
        raise SystemExit('SERVER_IMPORT_MARKER_NOT_FOUND')
    server = server.replace(marker, replacement, 1)

# Add a controlled professional-profile endpoint before verification routes.
route_marker = "  app.post('/api/verifications/create', rateLimiter, handleVerificationSubmission);"
if "app.post('/api/professional-profile/save'" not in server:
    route = r'''  app.post('/api/professional-profile/save', rateLimiter, async (req: Request, res: Response) => {
    try {
      const auth = await verifyAuthToken(req);
      if (!auth.isAuthenticated || !auth.userId) {
        res.status(401).json({ success: false, error: 'Se requiere autenticación válida.', code: auth.errorReason || 'UNAUTHORIZED' });
        return;
      }

      const {
        professionName,
        businessName,
        specialties,
        description,
        workZoneRadiusKm,
        workHours,
        matriculaOrDegree,
        hourlyRateArs
      } = req.body || {};

      const normalizedProfession = typeof professionName === 'string' ? professionName.trim() : '';
      const normalizedBusiness = typeof businessName === 'string' ? businessName.trim() : '';
      const normalizedDescription = typeof description === 'string' ? description.trim() : '';
      const normalizedHours = typeof workHours === 'string' ? workHours.trim() : '';
      const normalizedMatricula = typeof matriculaOrDegree === 'string' ? matriculaOrDegree.trim() : '';
      const normalizedSpecialties = Array.isArray(specialties)
        ? specialties.filter((item: unknown): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 20)
        : [];
      const radius = Number(workZoneRadiusKm);
      const hourlyRate = Number(hourlyRateArs);

      if (!normalizedProfession || normalizedProfession.length > 120) {
        res.status(400).json({ success: false, error: 'La profesión principal es obligatoria y debe ser válida.', code: 'INVALID_PROFESSION' });
        return;
      }
      if (normalizedBusiness.length > 160 || normalizedDescription.length > 2000 || normalizedHours.length > 200 || normalizedMatricula.length > 200) {
        res.status(400).json({ success: false, error: 'Uno o más campos del perfil exceden el tamaño permitido.', code: 'PROFILE_FIELD_TOO_LONG' });
        return;
      }
      if (!Number.isFinite(radius) || radius < 1 || radius > 100) {
        res.status(400).json({ success: false, error: 'El radio de cobertura debe estar entre 1 y 100 km.', code: 'INVALID_SERVICE_RADIUS' });
        return;
      }
      if (!Number.isFinite(hourlyRate) || hourlyRate < 0 || hourlyRate > 100000000) {
        res.status(400).json({ success: false, error: 'La tarifa indicada no es válida.', code: 'INVALID_HOURLY_RATE' });
        return;
      }

      const app = getFirebaseAdmin();
      if (!app) {
        res.status(503).json({ success: false, error: 'Firebase Admin no está configurado.', code: 'FIREBASE_ADMIN_NOT_CONFIGURED' });
        return;
      }
      const firestore = getAdminFirestore(app);
      const userRef = firestore.collection('users').doc(auth.userId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        res.status(404).json({ success: false, error: 'No se encontró el perfil del usuario.', code: 'USER_NOT_FOUND' });
        return;
      }

      const existing = userSnap.data() || {};
      if (existing.isBlocked === true) {
        res.status(403).json({ success: false, error: 'La cuenta no puede activar un perfil profesional mientras está bloqueada.', code: 'USER_BLOCKED' });
        return;
      }

      const profile = {
        professionName: normalizedProfession,
        businessName: normalizedBusiness || `${normalizedProfession} ${(existing.name || 'Profesional').toString().split(/\\s+/)[0]}`,
        specialties: normalizedSpecialties,
        description: normalizedDescription,
        workZoneRadiusKm: radius,
        workHours: normalizedHours,
        matriculaOrDegree: normalizedMatricula,
        hourlyRateArs: hourlyRate,
        hasProfessionalProfile: true,
        isProfessional: true,
        hasClientProfile: existing.hasClientProfile !== false,
        availabilityStatus: 'DISPONIBLE'
      };

      await userRef.set(profile, { merge: true });
      const updatedSnap = await userRef.get();
      const updatedUser = { id: auth.userId, ...(updatedSnap.data() || {}) };

      res.json({ success: true, user: updatedUser });
    } catch (err: any) {
      console.error('[CONEXA PROFILE] Error guardando perfil profesional:', err);
      res.status(500).json({ success: false, error: 'No se pudo guardar el perfil profesional.', code: err?.message || 'PROFESSIONAL_PROFILE_SAVE_ERROR' });
    }
  });

'''
    if route_marker not in server:
        raise SystemExit('VERIFICATION_ROUTE_MARKER_NOT_FOUND')
    server = server.replace(route_marker, route + route_marker, 1)

# Replace arbitrary document URL submission with an authenticated Storage path.
old = "const { type, documentName, documentUrl } = req.body || {};"
new = "const { type, documentName, documentPath } = req.body || {};"
if old in server:
    server = server.replace(old, new, 1)
old = "if (typeof documentName !== 'string' || !documentName.trim() || typeof documentUrl !== 'string' || !documentUrl.trim()) {"
new = "if (typeof documentName !== 'string' || !documentName.trim() || typeof documentPath !== 'string' || !documentPath.trim()) {"
if old in server:
    server = server.replace(old, new, 1)

# Insert Storage object validation immediately after the required-field validation block.
validation_anchor = "      if (typeof documentName !== 'string' || !documentName.trim() || typeof documentPath !== 'string' || !documentPath.trim()) {\n        res.status(400).json({ success: false, error: 'Documento requerido.', code: 'INVALID_DOCUMENT' });\n        return;\n      }"
if validation_anchor in server and 'DOCUMENT_PATH_NOT_OWNED' not in server:
    storage_check = validation_anchor + r'''

      const expectedPrefix = `verification-documents/${auth.userId}/`;
      if (!documentPath.startsWith(expectedPrefix) || documentPath.includes('..') || documentPath.includes('//')) {
        res.status(400).json({ success: false, error: 'La ruta del documento no pertenece al usuario autenticado.', code: 'DOCUMENT_PATH_NOT_OWNED' });
        return;
      }

      const app = getFirebaseAdmin();
      if (!app) {
        res.status(503).json({ success: false, error: 'Firebase Admin no está configurado.', code: 'FIREBASE_ADMIN_NOT_CONFIGURED' });
        return;
      }
      try {
        const bucket = getAdminStorage(app).bucket();
        const [metadata] = await bucket.file(documentPath).getMetadata();
        const contentType = String(metadata.contentType || '').toLowerCase();
        const size = Number(metadata.size || 0);
        const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
        if (!allowedTypes.has(contentType) || !Number.isFinite(size) || size <= 0 || size > 10 * 1024 * 1024) {
          res.status(400).json({ success: false, error: 'El documento almacenado no cumple las restricciones de verificación.', code: 'INVALID_VERIFICATION_DOCUMENT' });
          return;
        }
      } catch {
        res.status(400).json({ success: false, error: 'No se encontró el documento de verificación almacenado.', code: 'DOCUMENT_NOT_FOUND' });
        return;
      }'''
    server = server.replace(validation_anchor, storage_check, 1)

server = server.replace('documentUrl: documentUrl.trim(),', 'documentPath: documentPath.trim(),', 1)
SERVER.write_text(server, encoding='utf-8')

# Migrate the professional profile UI from direct Firestore writes to the backend authorization boundary.
modal = MODAL.read_text(encoding='utf-8')
modal = modal.replace("import { auth, db } from '../lib/firebase';\nimport { doc, setDoc } from 'firebase/firestore';\n", "import { auth } from '../lib/firebase';\n")
old_block = r'''    if (auth?.currentUser && db) {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      try {
        await setDoc(userDocRef, updatedUser, { merge: true });
        console.log('[CONEXA PROFILE] Perfil profesional guardado en Firestore para UID:', auth.currentUser.uid);
      } catch (err) {
        console.error('[CONEXA PROFILE] Error guardando en Firestore:', err);
        // Do not switch local state into professional mode when the
        // authoritative profile write failed.
        return;
      }
    }

    setCurrentUser(updatedUser);'''
new_block = r'''    if (!auth?.currentUser) {
      console.error('[CONEXA PROFILE] No hay sesión Firebase activa.');
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('/api/professional-profile/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          professionName,
          businessName,
          specialties: updatedSpecialties,
          description,
          workZoneRadiusKm: Number(workZoneRadiusKm),
          workHours,
          matriculaOrDegree,
          hourlyRateArs: Number(hourlyRateArs)
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.user) {
        throw new Error(data.error || data.code || 'No se pudo guardar el perfil profesional.');
      }

      setCurrentUser(data.user as typeof updatedUser);
    } catch (err) {
      console.error('[CONEXA PROFILE] Error guardando perfil profesional:', err);
      return;
    }'''
if old_block not in modal:
    raise SystemExit('MODAL_DIRECT_FIRESTORE_BLOCK_NOT_FOUND')
modal = modal.replace(old_block, new_block, 1)
MODAL.write_text(modal, encoding='utf-8')

# Update the context contract and request body to use Storage paths rather than URLs.
ctx = CTX.read_text(encoding='utf-8')
ctx = ctx.replace("submitVerification: (type: 'IDENTITY' | 'PROFESSIONAL', documentName: string, docUrl: string) => Promise<void>;", "submitVerification: (type: 'IDENTITY' | 'PROFESSIONAL', documentName: string, documentPath: string) => Promise<void>;")
ctx = ctx.replace("const submitVerification = async (type: 'IDENTITY' | 'PROFESSIONAL', documentName: string, docUrl: string) => {", "const submitVerification = async (type: 'IDENTITY' | 'PROFESSIONAL', documentName: string, documentPath: string) => {")
ctx = ctx.replace("body: JSON.stringify({ type, documentName, documentUrl: docUrl })", "body: JSON.stringify({ type, documentName, documentPath })")
ctx = ctx.replace("documentUrl: docUrl,", "documentPath,")
CTX.write_text(ctx, encoding='utf-8')

print('PROFILE_VERIFICATION_HARDENING_APPLIED')

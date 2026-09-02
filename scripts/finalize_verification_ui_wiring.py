from pathlib import Path

modal_path = Path('src/components/BecomeProfessionalModal.tsx')
modal = modal_path.read_text(encoding='utf-8')
if "uploadVerificationDocument" not in modal:
    modal = modal.replace("import { auth } from '../lib/firebase';\n", "import { auth } from '../lib/firebase';\nimport { uploadVerificationDocument } from '../services/verificationStorage';\n")
if "submitVerification } = useApp()" not in modal:
    modal = modal.replace("const { currentUser, setCurrentUser, trackEvent } = useApp();", "const { currentUser, setCurrentUser, trackEvent, submitVerification } = useApp();")
if "const [verificationFile" not in modal:
    modal = modal.replace("  const [hourlyRateArs, setHourlyRateArs] = useState<number>(currentUser.hourlyRateArs || 15000);", "  const [hourlyRateArs, setHourlyRateArs] = useState<number>(currentUser.hourlyRateArs || 15000);\n  const [verificationFile, setVerificationFile] = useState<File | null>(null);")
anchor = "      setCurrentUser(data.user as typeof updatedUser);\n    } catch (err) {"
if anchor in modal and "uploadVerificationDocument(verificationFile" not in modal:
    modal = modal.replace(anchor, """      setCurrentUser(data.user as typeof updatedUser);\n\n      if (verificationFile) {\n        try {\n          const uploaded = await uploadVerificationDocument(verificationFile, 'PROFESSIONAL');\n          await submitVerification('PROFESSIONAL', uploaded.name, uploaded.path);\n        } catch (verificationError) {\n          console.error('[CONEXA VERIFICATION] Error enviando documento profesional:', verificationError);\n          return;\n        }\n      }\n    } catch (err) {""", 1)
input_anchor = """            <input\n              type=\"text\"\n              value={matriculaOrDegree}\n              onChange={(e) => setMatriculaOrDegree(e.target.value)}\n              placeholder=\"Ej: Matrícula COPIT N° 4412 / Registro Municipal de Oficios\"\n              className=\"w-full p-2.5 bg-white border border-emerald-300/80 rounded-xl font-medium text-slate-900 focus:outline-none\"\n            />\n            <p className=\"text-[11px] text-emerald-800\">"""
if input_anchor in modal and "accept=\"image/jpeg,image/png,image/webp,application/pdf\"" not in modal:
    modal = modal.replace(input_anchor, input_anchor.replace('            <p className="text-[11px] text-emerald-800">', '''            <input\n              type="file"\n              accept="image/jpeg,image/png,image/webp,application/pdf"\n              onChange={(e) => setVerificationFile(e.target.files?.[0] || null)}\n              className="w-full p-2.5 bg-white border border-emerald-300/80 rounded-xl font-medium text-slate-900 focus:outline-none"\n            />\n            <p className="text-[11px] text-emerald-800">'''), 1)
modal_path.write_text(modal, encoding='utf-8')

service_path = Path('src/services/verificationStorage.ts')
service = service_path.read_text(encoding='utf-8')
if 'deleteObject' not in service:
    service = service.replace("import { ref, uploadBytes } from 'firebase/storage';", "import { deleteObject, ref, uploadBytes } from 'firebase/storage';")
    service += """

export async function deleteVerificationDocument(path: string): Promise<void> {
  const user = auth?.currentUser;
  if (!user) throw new Error('VERIFICATION_AUTH_REQUIRED');
  if (!storage) throw new Error('VERIFICATION_STORAGE_NOT_CONFIGURED');
  const expectedPrefix = `verification-documents/${user.uid}/`;
  if (!path.startsWith(expectedPrefix) || path.includes('..') || path.includes('//')) {
    throw new Error('VERIFICATION_PATH_NOT_OWNED');
  }
  await deleteObject(ref(storage, path));
}
"""
service_path.write_text(service, encoding='utf-8')

admin_path = Path('src/components/AdminPanel.tsx')
admin = admin_path.read_text(encoding='utf-8')
if "import { auth } from '../lib/firebase';" not in admin:
    admin = admin.replace("import { useApp } from '../context/AppContext';\n", "import { useApp } from '../context/AppContext';\nimport { auth } from '../lib/firebase';\n")
if 'handleOpenVerificationDocument' not in admin:
    anchor = "  const handleRunAudit = () => {\n"
    handler = """  const handleOpenVerificationDocument = async (verificationId: string) => {\n    if (!auth?.currentUser) return;\n    try {\n      const token = await auth.currentUser.getIdToken();\n      const response = await fetch(`/api/admin/verifications/${encodeURIComponent(verificationId)}/document-url`, {\n        headers: { Authorization: `Bearer ${token}` }\n      });\n      const data = await response.json();\n      if (!response.ok || !data.success || !data.url) throw new Error(data.error || data.code || 'No se pudo abrir el documento.');\n      window.open(data.url, '_blank', 'noopener,noreferrer');\n    } catch (error) {\n      console.error('[CONEXA ADMIN] Error abriendo documento de verificación:', error);\n    }\n  };\n\n"""
    if anchor not in admin:
        raise SystemExit('ADMIN_AUDIT_HANDLER_ANCHOR_NOT_FOUND')
    admin = admin.replace(anchor, handler + anchor, 1)
button_anchor = """                <div className=\"flex gap-2 shrink-0\">\n                  <button\n                    onClick={() => approveVerification(v.id)}"""
if button_anchor in admin and 'handleOpenVerificationDocument(v.id)' not in admin:
    admin = admin.replace(button_anchor, """                <div className=\"flex gap-2 shrink-0\">\n                  <button\n                    onClick={() => handleOpenVerificationDocument(v.id)}\n                    className=\"px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1 shadow-xs shrink-0\"\n                  >\n                    <FileText size={14} />\n                    Ver documento\n                  </button>\n                  <button\n                    onClick={() => approveVerification(v.id)}""", 1)
admin_path.write_text(admin, encoding='utf-8')

print('FINAL_VERIFICATION_UI_WIRING_APPLIED')

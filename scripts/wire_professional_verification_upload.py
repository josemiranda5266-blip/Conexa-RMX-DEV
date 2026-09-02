from pathlib import Path

modal_path = Path('src/components/BecomeProfessionalModal.tsx')
modal = modal_path.read_text(encoding='utf-8')

modal = modal.replace(
    "import { auth } from '../lib/firebase';\n",
    "import { auth } from '../lib/firebase';\nimport { uploadVerificationDocument } from '../services/verificationStorage';\n"
)
modal = modal.replace(
    "const { currentUser, setCurrentUser, trackEvent } = useApp();",
    "const { currentUser, setCurrentUser, trackEvent, submitVerification } = useApp();"
)
modal = modal.replace(
    "  const [hourlyRateArs, setHourlyRateArs] = useState<number>(currentUser.hourlyRateArs || 15000);",
    "  const [hourlyRateArs, setHourlyRateArs] = useState<number>(currentUser.hourlyRateArs || 15000);\n  const [verificationFile, setVerificationFile] = useState<File | null>(null);"
)

anchor = """      setCurrentUser(data.user as typeof updatedUser);\n    } catch (err) {"""
replacement = """      setCurrentUser(data.user as typeof updatedUser);\n\n      if (verificationFile) {\n        try {\n          const uploaded = await uploadVerificationDocument(verificationFile, 'PROFESSIONAL');\n          await submitVerification('PROFESSIONAL', uploaded.name, uploaded.path);\n        } catch (verificationError) {\n          console.error('[CONEXA VERIFICATION] Error enviando documento profesional:', verificationError);\n          return;\n        }\n      }\n    } catch (err) {"""
if anchor not in modal:
    raise SystemExit('MODAL_PROFILE_SUCCESS_ANCHOR_NOT_FOUND')
modal = modal.replace(anchor, replacement, 1)

input_anchor = """            <input\n              type=\"text\"\n              value={matriculaOrDegree}\n              onChange={(e) => setMatriculaOrDegree(e.target.value)}\n              placeholder=\"Ej: Matrícula COPIT N° 4412 / Registro Municipal de Oficios\"\n              className=\"w-full p-2.5 bg-white border border-emerald-300/80 rounded-xl font-medium text-slate-900 focus:outline-none\"\n            />\n            <p className=\"text-[11px] text-emerald-800\">"""
input_replacement = """            <input\n              type=\"text\"\n              value={matriculaOrDegree}\n              onChange={(e) => setMatriculaOrDegree(e.target.value)}\n              placeholder=\"Ej: Matrícula COPIT N° 4412 / Registro Municipal de Oficios\"\n              className=\"w-full p-2.5 bg-white border border-emerald-300/80 rounded-xl font-medium text-slate-900 focus:outline-none\"\n            />\n            <input\n              type=\"file\"\n              accept=\"image/jpeg,image/png,image/webp,application/pdf\"\n              onChange={(e) => setVerificationFile(e.target.files?.[0] || null)}\n              className=\"w-full p-2.5 bg-white border border-emerald-300/80 rounded-xl font-medium text-slate-900 focus:outline-none\"\n            />\n            <p className=\"text-[11px] text-emerald-800\">"""
if input_anchor not in modal:
    raise SystemExit('MODAL_VERIFICATION_INPUT_ANCHOR_NOT_FOUND')
modal = modal.replace(input_anchor, input_replacement, 1)
modal_path.write_text(modal, encoding='utf-8')

service_path = Path('src/services/verificationStorage.ts')
service = service_path.read_text(encoding='utf-8')
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

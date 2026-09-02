from pathlib import Path

path = Path('src/components/AdminPanel.tsx')
text = path.read_text(encoding='utf-8')
text = text.replace("import { useApp } from '../context/AppContext';\n", "import { useApp } from '../context/AppContext';\nimport { auth } from '../lib/firebase';\n")

anchor = "  const handleRunAudit = () => {\n"
handler = """  const handleOpenVerificationDocument = async (verificationId: string) => {\n    if (!auth?.currentUser) return;\n    try {\n      const token = await auth.currentUser.getIdToken();\n      const response = await fetch(`/api/admin/verifications/${encodeURIComponent(verificationId)}/document-url`, {\n        headers: { Authorization: `Bearer ${token}` }\n      });\n      const data = await response.json();\n      if (!response.ok || !data.success || !data.url) {\n        throw new Error(data.error || data.code || 'No se pudo abrir el documento.');\n      }\n      window.open(data.url, '_blank', 'noopener,noreferrer');\n    } catch (error) {\n      console.error('[CONEXA ADMIN] Error abriendo documento de verificación:', error);\n    }\n  };\n\n"""
if anchor not in text:
    raise SystemExit('ADMIN_AUDIT_HANDLER_ANCHOR_NOT_FOUND')
text = text.replace(anchor, handler + anchor, 1)

button_anchor = """                <div className=\"flex gap-2 shrink-0\">\n                  <button\n                    onClick={() => approveVerification(v.id)}"""
button_replacement = """                <div className=\"flex gap-2 shrink-0\">\n                  <button\n                    onClick={() => handleOpenVerificationDocument(v.id)}\n                    className=\"px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1 shadow-xs shrink-0\"\n                  >\n                    <FileText size={14} />\n                    Ver documento\n                  </button>\n                  <button\n                    onClick={() => approveVerification(v.id)"""
if button_anchor not in text:
    raise SystemExit('ADMIN_VERIFICATION_BUTTON_ANCHOR_NOT_FOUND')
text = text.replace(button_anchor, button_replacement, 1)
path.write_text(text, encoding='utf-8')

from pathlib import Path
path = Path('src/types.ts')
text = path.read_text(encoding='utf-8')
old = '''  documentName: string;\n  documentUrl: string;\n  status: VerificationStatus;'''
new = '''  documentName: string;\n  /** Storage object path only; never expose a public download URL. */\n  documentPath: string;\n  status: VerificationStatus;'''
if old not in text:
    raise SystemExit('VERIFICATION_TYPE_BLOCK_NOT_FOUND')
path.write_text(text.replace(old, new, 1), encoding='utf-8')

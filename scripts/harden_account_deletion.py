from pathlib import Path

path = Path('server.ts')
text = path.read_text(encoding='utf-8')

old = '''        // Mask or delete user's messages in Firestore to avoid digital footprint (Requirement 13)
        const messagesSnapshot = await db.collection('messages').where('senderId', '==', userId).get();
        const batch = db.batch();
        messagesSnapshot.forEach((doc: any) => {
          batch.update(doc.ref, {
            text: "[MENSAJE ELIMINADO - USUARIO DADO DE BAJA]",
            content: "[MENSAJE ELIMINADO - USUARIO DADO DE BAJA]",
            isDeleted: true
          });
        });
        await batch.commit();
'''

new = '''        // Preserve conversation integrity while removing the user's message content.
        // Current chat messages live under conversations/{conversationId}/messages, not a
        // top-level messages collection. collectionGroup() covers the canonical hierarchy.
        const messageSnapshot = await db.collectionGroup('messages').where('senderId', '==', userId).get();
        const messageDocs = messageSnapshot.docs;
        for (let offset = 0; offset < messageDocs.length; offset += 400) {
          const batch = db.batch();
          messageDocs.slice(offset, offset + 400).forEach((messageDoc: any) => {
            batch.update(messageDoc.ref, {
              content: '[MENSAJE ELIMINADO - USUARIO DADO DE BAJA]',
              senderName: 'Usuario dado de baja',
              isDeleted: true
            });
          });
          await batch.commit();
        }

        // Remove private verification documents owned by the deleted account.
        try {
          const app = getFirebaseAdmin();
          if (app) {
            const bucket = getAdminStorage(app).bucket();
            const [verificationFiles] = await bucket.getFiles({ prefix: `verification-documents/${userId}/` });
            if (verificationFiles.length > 0) {
              await Promise.all(verificationFiles.map((file: any) => file.delete().catch(() => undefined)));
            }
          }
        } catch (storageError) {
          console.warn('[CONEXA STORAGE] No se pudieron eliminar todos los documentos privados del usuario:', storageError);
        }
'''

if old not in text:
    raise SystemExit('ACCOUNT_MESSAGE_DELETION_BLOCK_NOT_FOUND')
text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')

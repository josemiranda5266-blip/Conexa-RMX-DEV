import { ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '../lib/firebase';

const MAX_VERIFICATION_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_VERIFICATION_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export type VerificationDocumentType = 'IDENTITY' | 'PROFESSIONAL';

export interface UploadedVerificationDocument {
  path: string;
  name: string;
  contentType: string;
  size: number;
}

export async function uploadVerificationDocument(
  file: File,
  type: VerificationDocumentType,
): Promise<UploadedVerificationDocument> {
  const user = auth?.currentUser;
  if (!user) throw new Error('VERIFICATION_AUTH_REQUIRED');
  if (!storage) throw new Error('VERIFICATION_STORAGE_NOT_CONFIGURED');
  if (!(file instanceof File)) throw new Error('VERIFICATION_FILE_REQUIRED');
  if (!ALLOWED_VERIFICATION_TYPES.has(file.type)) {
    throw new Error('VERIFICATION_FILE_TYPE_NOT_ALLOWED');
  }
  if (file.size <= 0 || file.size > MAX_VERIFICATION_FILE_SIZE) {
    throw new Error('VERIFICATION_FILE_SIZE_NOT_ALLOWED');
  }

  const uploadId = crypto.randomUUID();
  const path = `verification-documents/${user.uid}/${uploadId}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      ownerUid: user.uid,
      verificationType: type,
    },
  });

  return {
    path,
    name: file.name.slice(0, 180),
    contentType: file.type,
    size: file.size,
  };
}

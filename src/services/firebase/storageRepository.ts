import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { StoredImage } from '../../types';
import { createUniqueId, validateImageFile } from '../../domain/validation';
import { storage } from './client';

export interface UploadDestination {
  scope: 'projects' | 'settings' | 'craftsmen';
  ownerId: string;
  slot: string;
}

function safePathSegment(value: string): string {
  const raw = value.trim();
  const ascii = raw.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (ascii === raw && ascii) return ascii.slice(0, 80);
  const encoded = Array.from(new TextEncoder().encode(raw))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `${ascii || 'u'}-${encoded}`.slice(0, 80);
}

function fileExtension(file: File): string {
  const byType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  };
  return byType[file.type] ?? 'img';
}

export async function uploadPublicImage(
  file: File,
  destination: UploadDestination,
  onProgress?: (percent: number) => void,
): Promise<StoredImage> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const objectPath = [
    'public',
    destination.scope,
    safePathSegment(destination.ownerId),
    safePathSegment(destination.slot),
    `${createUniqueId()}.${fileExtension(file)}`,
  ].join('/');

  const objectRef = ref(storage, objectPath);
  const task = uploadBytesResumable(objectRef, file, {
    contentType: file.type,
    customMetadata: {
      ownerId: destination.ownerId,
      slot: destination.slot,
      originalName: file.name.slice(0, 120),
    },
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        const percent = snapshot.totalBytes > 0
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        onProgress?.(percent);
      },
      reject,
      resolve,
    );
  });

  return {
    url: await getDownloadURL(task.snapshot.ref),
    path: objectPath,
    contentType: file.type,
    size: file.size,
    originalName: file.name.slice(0, 120),
    uploadedAt: new Date().toISOString(),
  };
}

export async function deleteStoredImage(asset?: StoredImage): Promise<void> {
  if (!asset?.path?.startsWith('public/')) return;
  await deleteObject(ref(storage, asset.path));
}

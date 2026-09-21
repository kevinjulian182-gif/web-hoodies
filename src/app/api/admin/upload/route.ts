import { NextRequest, NextResponse } from 'next/server';
import { put, BlobError } from '@vercel/blob';
import sharp from 'sharp';
import { getSession, requireRole } from '@/lib/auth';

// Vercel's serverless functions cap the whole request body around 4.5MB and
// reject anything larger with a platform-level 413 before this handler ever
// runs — these limits stay under that so our own, friendlier message is the
// one that actually fires. Images are compressed client-side before upload
// (see MediaUploader) so this is rarely the binding constraint for photos;
// video has no such client-side shrink yet, so a phone video over ~4MB will
// still fail — a real fix needs a direct-to-Blob client upload with a
// signed token instead of routing the file through this function.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  // Don't gate on BLOB_READ_WRITE_TOKEN specifically: a store connected via
  // Vercel's OIDC flow authenticates with BLOB_STORE_ID + an OIDC token
  // instead, with no static token env var at all. Let put() itself decide
  // whether it has usable credentials.
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Archivo faltante' }, { status: 400 });
  }

  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: 'Solo se permiten imágenes o videos' }, { status: 400 });
  }

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `El archivo supera el máximo permitido (${Math.round(maxBytes / (1024 * 1024))}MB)` },
      { status: 400 }
    );
  }

  try {
    if (isImage) {
      // Re-encode to WebP and cap dimensions: shrinks typical product photos
      // by 60-80% with no visible quality loss, so the catalog loads faster.
      const original = Buffer.from(await file.arrayBuffer());
      const optimized = await sharp(original)
        .rotate()
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      const baseName = file.name.replace(/\.[^./]+$/, '');
      const blob = await put(`products/${Date.now()}-${baseName}.webp`, optimized, {
        access: 'public',
        addRandomSuffix: true,
        contentType: 'image/webp',
      });
      return NextResponse.json({ url: blob.url, type: 'image' });
    }

    const blob = await put(`products/${Date.now()}-${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url, type: 'video' });
  } catch (err) {
    const message = err instanceof BlobError ? err.message : 'No se pudo subir el archivo';
    console.error('Blob upload failed:', err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

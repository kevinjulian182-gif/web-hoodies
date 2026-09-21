import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { getSession, requireRole } from '@/lib/auth';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Almacenamiento de archivos no configurado (falta conectar Vercel Blob al proyecto)' },
      { status: 503 }
    );
  }

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
}

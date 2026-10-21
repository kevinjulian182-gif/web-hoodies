import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { copyrightExif } from '@/lib/imageRights';

// Product photos are stored as WebP (lighter for the store), but Meta's
// catalog — and with it WhatsApp Business — only takes JPG/PNG and wants
// square images of at least 500 px. The catalog feed points here instead
// of at the original, and this returns a 1080×1080 JPG with the photo
// centered on white.
//
// Only the store's own photos are converted (Vercel Blob or this site), so
// this can't be used to fetch arbitrary URLs.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wearafra.com').replace(/\/$/, '');

function allowed(url: URL): boolean {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  return url.hostname.endsWith('.blob.vercel-storage.com') || url.origin === new URL(SITE_URL).origin;
}

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get('src');
  if (!src) return new Response('Falta la imagen', { status: 400 });

  let url: URL;
  try {
    url = new URL(src, SITE_URL);
  } catch {
    return new Response('URL inválida', { status: 400 });
  }
  if (!allowed(url)) return new Response('Imagen no permitida', { status: 403 });

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return new Response('No se encontró la imagen', { status: 404 });
    const jpg = await sharp(Buffer.from(await res.arrayBuffer()))
      .rotate()
      .resize(1080, 1080, { fit: 'contain', background: '#ffffff' })
      .flatten({ background: '#ffffff' })
      .withExif(copyrightExif())
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    return new Response(new Uint8Array(jpg), {
      headers: {
        'Content-Type': 'image/jpeg',
        // Each upload has its own unique URL, so the result never changes.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('No se pudo convertir la imagen', { status: 502 });
  }
}

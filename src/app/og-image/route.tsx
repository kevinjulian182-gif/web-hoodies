import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { getSiteContent } from '@/lib/content';
import { absoluteUrl } from '@/lib/seo';
import { copyrightExif } from '@/lib/imageRights';

// The image social networks show when wearafra.com is shared. Uses the one
// uploaded in Admin › Contenido › General (cropped to 1200×630 JPG), or a
// branded card generated on the fly when none is set.

const SIZE = { width: 1200, height: 630 };
const HEADERS = { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' };

export async function GET() {
  const content = await getSiteContent();
  const uploaded = content['site.og_image'];

  if (uploaded) {
    try {
      const res = await fetch(absoluteUrl(uploaded), { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const jpg = await sharp(Buffer.from(await res.arrayBuffer()))
          .rotate()
          .resize(SIZE.width, SIZE.height, { fit: 'cover', position: 'attention' })
          .flatten({ background: '#fbf6ec' })
          .withExif(copyrightExif())
          .jpeg({ quality: 86, mozjpeg: true })
          .toBuffer();
        return new Response(new Uint8Array(jpg), { headers: HEADERS });
      }
    } catch {
      // fall back to the generated card
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#291C13',
          color: '#FBF6EC',
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 10, opacity: 0.7 }}>WEARAFRA.COM</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 160, fontWeight: 800, letterSpacing: 24, lineHeight: 1 }}>AFRA</div>
          <div style={{ marginTop: 28, fontSize: 44, lineHeight: 1.25, maxWidth: 900, color: '#EAD09C' }}>
            Hoodies y streetwear de marca en Colombia
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28, fontSize: 28, opacity: 0.85 }}>
          <span>Pago contra entrega</span>
          <span>·</span>
          <span>Envíos a toda Colombia</span>
          <span>·</span>
          <span>Cambios fáciles</span>
        </div>
      </div>
    ),
    { ...SIZE, headers: { 'Cache-Control': HEADERS['Cache-Control'] } }
  );
}

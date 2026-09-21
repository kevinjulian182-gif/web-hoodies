import { NextRequest, NextResponse } from 'next/server';
import { put, BlobError } from '@vercel/blob';
import { z } from 'zod';
import { getSession, requireRole } from '@/lib/auth';
import { getConfigValue } from '@/lib/config';

const schema = z.object({ imageUrl: z.string().url() });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const apiKey = await getConfigValue('REMOVE_BG_API_KEY');
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Quitar fondo no está configurado. Agrega la API key de remove.bg en Configuración.' },
      { status: 503 }
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Falta la URL de la imagen' }, { status: 400 });
  }

  const form = new FormData();
  form.append('image_url', parsed.data.imageUrl);
  form.append('size', 'auto');

  try {
    const rbRes = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: form,
    });

    if (!rbRes.ok) {
      const detail = await rbRes.json().catch(() => null);
      const message = detail?.errors?.[0]?.title ?? `remove.bg respondió con error ${rbRes.status}`;
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const buffer = Buffer.from(await rbRes.arrayBuffer());
    const blob = await put(`products/${Date.now()}-no-bg.png`, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: 'image/png',
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const message = err instanceof BlobError ? err.message : 'No se pudo quitar el fondo';
    console.error('Background removal failed:', err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

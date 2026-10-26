import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recordConsent } from '@/lib/consent';

// Records the cookie banner choice (accept all / only necessary).
const schema = z.object({ cookies: z.enum(['all', 'necessary']) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  await recordConsent(req, { source: 'cookies', cookies: parsed.data.cookies });
  return NextResponse.json({ ok: true });
}

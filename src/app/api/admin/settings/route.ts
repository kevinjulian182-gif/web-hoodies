import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireRole } from '@/lib/auth';
import { CONFIG_KEYS, getAllConfigMasked, setConfigValue } from '@/lib/config';

export async function GET() {
  const session = await getSession();
  if (!requireRole(session, ['SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  return NextResponse.json(await getAllConfigMasked());
}

const schema = z.object({
  key: z.enum(CONFIG_KEYS),
  value: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await setConfigValue(parsed.data.key, parsed.data.value);
  return NextResponse.json({ ok: true });
}

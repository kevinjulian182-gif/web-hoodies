import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireRole } from '@/lib/auth';
import { setConfigValue } from '@/lib/config';
import { DEFAULT_EMAIL_FROM, getEmailSettings, getLastEmailResult } from '@/lib/email';
import { getCustomerWhatsAppKey, getLastCustomerWhatsAppResult } from '@/lib/orderNotify';

// Status of the confirmations the customer gets (email + WhatsApp).
export async function GET() {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const [settings, lastEmail, waKey, lastWhatsApp] = await Promise.all([
    getEmailSettings(),
    getLastEmailResult(),
    getCustomerWhatsAppKey(),
    getLastCustomerWhatsAppResult(),
  ]);
  return NextResponse.json({
    configured: Boolean(settings.apiKey),
    from: settings.from,
    defaultFrom: DEFAULT_EMAIL_FROM,
    lastEmail,
    whatsappReady: Boolean(waKey),
    lastWhatsApp,
  });
}

const schema = z.object({
  apiKey: z.string().trim().startsWith('re_', 'La API key de Resend empieza por "re_".').optional(),
  // "Nombre <correo@dominio>" or a bare address.
  from: z
    .string()
    .trim()
    .regex(/^([^<>]+<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>|[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)$/, 'Escribe un remitente como: AFRA <pedidos@wearafra.com>')
    .optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  const { apiKey, from } = parsed.data;
  if (apiKey) await setConfigValue('RESEND_API_KEY', apiKey);
  if (from) await setConfigValue('EMAIL_FROM', from);
  return NextResponse.json({ ok: true });
}

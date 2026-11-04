import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireRole } from '@/lib/auth';
import { setConfigValue } from '@/lib/config';
import { getAlertProvider, getTelegramConfig } from '@/lib/orderNotify';
import { getSiteContent } from '@/lib/content';
import { getStoreWhatsAppNumber } from '@/lib/whatsapp';

// WhatsApp order alerts: any admin can see the status and set the CallMeBot
// key (unlike the other system keys, which are Super Admin only — this one
// can only message the store's own number).
export async function GET() {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const [config, telegram, content] = await Promise.all([getAlertProvider(), getTelegramConfig(), getSiteContent()]);
  return NextResponse.json({
    provider: config?.provider ?? null,
    phone: getStoreWhatsAppNumber(content),
    telegram: telegram ? (telegram.chatId ? 'connected' : 'pending') : null,
  });
}

const schema = z.object({
  provider: z.enum(['textmebot', 'callmebot']),
  apiKey: z.string().trim().min(3).max(200),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'API key inválida' }, { status: 400 });
  await setConfigValue(parsed.data.provider === 'textmebot' ? 'TEXTMEBOT_API_KEY' : 'CALLMEBOT_API_KEY', parsed.data.apiKey);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireRole } from '@/lib/auth';
import { getConfigValue, setConfigValue } from '@/lib/config';

const schema = z.object({ token: z.string().trim().regex(/^\d+:[\w-]{20,}$/, 'Token inválido').optional() });

// Saves the bot token (when given) and links the chat: finds the most recent
// chat that wrote to the bot, so the admin never has to look up a chat id.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'El token no tiene el formato de BotFather (números:letras).' }, { status: 400 });
  }
  const token = parsed.data.token ?? (await getConfigValue('TELEGRAM_BOT_TOKEN'));
  if (!token) return NextResponse.json({ error: 'Pega primero el token del bot.' }, { status: 400 });

  try {
    const me = await fetch(`https://api.telegram.org/bot${token}/getMe`, { cache: 'no-store', signal: AbortSignal.timeout(10000) }).then((r) => r.json());
    if (!me?.ok) return NextResponse.json({ error: 'Telegram no reconoce ese token. Cópialo de nuevo desde BotFather.' }, { status: 400 });
    if (parsed.data.token) await setConfigValue('TELEGRAM_BOT_TOKEN', token);
    const botUsername: string = me.result.username;

    const updates = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, { cache: 'no-store', signal: AbortSignal.timeout(10000) }).then((r) => r.json());
    const chats = (updates?.result ?? [])
      .map((u: { message?: { chat?: { id: number } }; my_chat_member?: { chat?: { id: number } } }) => u.message?.chat?.id ?? u.my_chat_member?.chat?.id)
      .filter((id: unknown): id is number => typeof id === 'number');
    const chatId = chats.at(-1);
    if (!chatId) {
      return NextResponse.json({ connected: false, botUsername });
    }
    await setConfigValue('TELEGRAM_CHAT_ID', String(chatId));
    return NextResponse.json({ connected: true, botUsername });
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con Telegram. Intenta de nuevo.' }, { status: 502 });
  }
}

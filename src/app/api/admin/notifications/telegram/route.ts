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

    const getUpdates = () =>
      fetch(`https://api.telegram.org/bot${token}/getUpdates`, { cache: 'no-store', signal: AbortSignal.timeout(10000) }).then((r) => r.json());
    let updates = await getUpdates();
    // A bot with a webhook set (e.g. used before with another tool) can't be
    // read with getUpdates (409 Conflict): drop the webhook and retry.
    if (!updates?.ok && updates?.error_code === 409) {
      await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      updates = await getUpdates();
    }
    if (!updates?.ok) {
      return NextResponse.json({ error: `Telegram respondió: ${updates?.description ?? 'error desconocido'}` }, { status: 502 });
    }
    type Chat = { id: number; first_name?: string; username?: string; title?: string };
    const chats: Chat[] = (updates.result ?? [])
      .map((u: { message?: { chat?: Chat }; my_chat_member?: { chat?: Chat }; edited_message?: { chat?: Chat } }) =>
        u.message?.chat ?? u.edited_message?.chat ?? u.my_chat_member?.chat
      )
      .filter((c: Chat | undefined): c is Chat => typeof c?.id === 'number');
    const chat = chats[chats.length - 1];
    if (!chat) {
      return NextResponse.json({ connected: false, botUsername });
    }
    await setConfigValue('TELEGRAM_CHAT_ID', String(chat.id));
    const chatName = chat.title ?? chat.first_name ?? (chat.username ? `@${chat.username}` : String(chat.id));
    return NextResponse.json({ connected: true, botUsername, chatName });
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con Telegram. Intenta de nuevo.' }, { status: 502 });
  }
}

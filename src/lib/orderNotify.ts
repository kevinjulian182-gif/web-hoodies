import { formatCOP } from '@/lib/format';
import { getConfigValue } from '@/lib/config';
import { getSiteContent } from '@/lib/content';
import { getStoreWhatsAppNumber } from '@/lib/whatsapp';

// Internal heads-up to the store's own WhatsApp (the number set in Admin >
// Contenido) whenever an order is confirmed. Sent through a personal-use
// gateway — TextMeBot or CallMeBot — that messages the owner's *own* number
// with just an API key: no Meta Business account or message templates.

type OrderForAlert = {
  wompiReference: string;
  customerName: string;
  customerEmail: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingAddressComplement?: string | null;
  shippingCity: string;
  shippingDepartment?: string | null;
  deliveryNotes?: string | null;
  paymentMethod: 'WOMPI' | 'COD';
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  couponCode?: string | null;
  items: { quantity: number; size: string; color?: string | null; priceCents: number; product: { name: string } }[];
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wearafra.com').replace(/\/$/, '');

export function buildStoreOrderAlert(order: OrderForAlert): string {
  const address = [
    order.shippingAddress,
    order.shippingAddressComplement,
    order.shippingCity,
    order.shippingDepartment,
  ]
    .filter(Boolean)
    .join(', ');
  const items = order.items.map(
    (i) =>
      `• ${i.quantity}x ${i.product.name} — Talla ${i.size}${i.color ? `, ${i.color}` : ''} (${formatCOP(i.priceCents * i.quantity)})`
  );
  return [
    `🛍️ *Nuevo pedido en AFRA* (${order.wompiReference})`,
    '',
    ...items,
    '',
    order.discountCents > 0
      ? `Subtotal: ${formatCOP(order.subtotalCents)} · Descuento${order.couponCode ? ` (${order.couponCode})` : ''}: -${formatCOP(order.discountCents)}`
      : null,
    `*Total: ${formatCOP(order.totalCents)}*`,
    order.paymentMethod === 'COD' ? '💵 Pago contra entrega' : '✅ Pagado con Wompi',
    '',
    `👤 ${order.customerName}`,
    `📞 ${order.shippingPhone}`,
    `✉️ ${order.customerEmail}`,
    `📍 ${address}`,
    order.deliveryNotes ? `📝 ${order.deliveryNotes}` : null,
    '',
    `Ver pedidos: ${SITE_URL}/admin/orders`,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export type AlertProvider = 'textmebot' | 'callmebot';

/** Which gateway is set up: TextMeBot (links the store's own WhatsApp by QR,
 * paid, stable) wins over CallMeBot (free shared number, often full or
 * blocked) when both have a key. */
export async function getAlertProvider(): Promise<{ provider: AlertProvider; apiKey: string } | null> {
  const [textme, callme] = await Promise.all([getConfigValue('TEXTMEBOT_API_KEY'), getConfigValue('CALLMEBOT_API_KEY')]);
  if (textme) return { provider: 'textmebot', apiKey: textme };
  if (callme) return { provider: 'callmebot', apiKey: callme };
  return null;
}

/** Sends a WhatsApp message to the store's number. Never throws: an alert
 * failing must not break checkout. */
export async function sendStoreWhatsApp(text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const config = await getAlertProvider();
    if (!config) return { ok: false, error: 'Falta configurar el servicio de avisos (API key).' };
    const phone = getStoreWhatsAppNumber(await getSiteContent());
    if (!phone) return { ok: false, error: 'No hay número de WhatsApp en Admin › Contenido.' };

    const url =
      config.provider === 'textmebot'
        ? `https://api.textmebot.com/send.php?recipient=%2B${phone}&apikey=${encodeURIComponent(config.apiKey)}&text=${encodeURIComponent(text)}`
        : `https://api.callmebot.com/whatsapp.php?phone=%2B${phone}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(config.apiKey)}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const body = await res.text();
    // Both gateways can answer 200 with an HTML/text note on failure.
    if (!res.ok || /\b(error|invalid|not allowed|wrong|full|blocked|expired)\b/i.test(body)) {
      const reason = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
      console.error(`${config.provider} rechazó el mensaje:`, res.status, reason);
      return { ok: false, error: reason || `Error ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('No se pudo enviar el aviso por WhatsApp:', err);
    return { ok: false, error: 'No se pudo conectar con el servicio de avisos.' };
  }
}

// ── Telegram (free, official Bot API) ────────────────────────────────────

export async function getTelegramConfig(): Promise<{ token: string; chatId: string | null } | null> {
  const [token, chatId] = await Promise.all([getConfigValue('TELEGRAM_BOT_TOKEN'), getConfigValue('TELEGRAM_CHAT_ID')]);
  return token ? { token, chatId } : null;
}

export async function sendTelegram(text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const config = await getTelegramConfig();
    if (!config) return { ok: false, error: 'Telegram no está configurado.' };
    if (!config.chatId) return { ok: false, error: 'Falta conectar el chat: escríbele al bot y toca «Conectar».' };
    const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Plain text: WhatsApp-style *bold* marks are dropped rather than risk
      // Telegram rejecting the message over an unescaped character.
      body: JSON.stringify({ chat_id: config.chatId, text: text.replace(/\*/g, ''), disable_web_page_preview: true }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return { ok: false, error: data?.description ?? `Error ${res.status}` };
    return { ok: true };
  } catch (err) {
    console.error('No se pudo enviar el aviso por Telegram:', err);
    return { ok: false, error: 'No se pudo conectar con Telegram.' };
  }
}

/** Sends the alert on every configured channel (Telegram and/or WhatsApp). */
export async function sendStoreAlert(
  text: string
): Promise<{ ok: boolean; results: { channel: string; ok: boolean; error?: string }[] }> {
  const [telegram, whatsappProvider] = await Promise.all([getTelegramConfig(), getAlertProvider()]);
  const jobs: Promise<{ channel: string; ok: boolean; error?: string }>[] = [];
  if (telegram) jobs.push(sendTelegram(text).then((r) => ({ channel: 'Telegram', ...r })));
  if (whatsappProvider) jobs.push(sendStoreWhatsApp(text).then((r) => ({ channel: 'WhatsApp', ...r })));
  if (jobs.length === 0) return { ok: false, results: [{ channel: 'Avisos', ok: false, error: 'No hay ningún canal configurado.' }] };
  const results = await Promise.all(jobs);
  return { ok: results.some((r) => r.ok), results };
}

export async function notifyStoreNewOrder(order: OrderForAlert): Promise<void> {
  const { results } = await sendStoreAlert(buildStoreOrderAlert(order));
  for (const r of results) if (!r.ok) console.warn(`Aviso de pedido por ${r.channel} no enviado:`, r.error);
}

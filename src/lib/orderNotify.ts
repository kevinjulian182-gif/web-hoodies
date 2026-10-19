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

export async function notifyStoreNewOrder(order: OrderForAlert): Promise<void> {
  const result = await sendStoreWhatsApp(buildStoreOrderAlert(order));
  if (!result.ok) console.warn('Aviso de pedido por WhatsApp no enviado:', result.error);
}

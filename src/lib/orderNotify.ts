import { formatCOP } from '@/lib/format';
import { getConfigValue } from '@/lib/config';
import { getSiteContent } from '@/lib/content';
import { getStoreWhatsAppNumber } from '@/lib/whatsapp';

// Internal heads-up to the store's own WhatsApp (the number set in Admin >
// Contenido) whenever an order is confirmed. Sent through CallMeBot, a free
// gateway for messaging your *own* number: the owner activates it once from
// their phone and gets an API key. No Meta Business account or templates.

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

/** Sends a WhatsApp message to the store's number. Never throws: an alert
 * failing must not break checkout. */
export async function sendStoreWhatsApp(text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const apiKey = await getConfigValue('CALLMEBOT_API_KEY');
    if (!apiKey) return { ok: false, error: 'Falta la API key de CallMeBot.' };
    const phone = getStoreWhatsAppNumber(await getSiteContent());
    if (!phone) return { ok: false, error: 'No hay número de WhatsApp en Admin › Contenido.' };

    const url =
      `https://api.callmebot.com/whatsapp.php?phone=%2B${phone}` +
      `&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    const body = await res.text();
    // CallMeBot answers 200 with an HTML note even on some failures.
    if (!res.ok || /error|invalid|not allowed|wrong/i.test(body)) {
      const reason = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
      console.error('CallMeBot rechazó el mensaje:', res.status, reason);
      return { ok: false, error: reason || `Error ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('No se pudo enviar el aviso por WhatsApp:', err);
    return { ok: false, error: 'No se pudo conectar con CallMeBot.' };
  }
}

export async function notifyStoreNewOrder(order: OrderForAlert): Promise<void> {
  const result = await sendStoreWhatsApp(buildStoreOrderAlert(order));
  if (!result.ok) console.warn('Aviso de pedido por WhatsApp no enviado:', result.error);
}

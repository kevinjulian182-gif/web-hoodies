import { formatCOP } from '@/lib/format';
import type { SiteContent } from '@/lib/content';

/** Normalizes a Colombian phone number to the digits-only, country-code-
 * prefixed form wa.me needs (e.g. "313 808 9302" or "3138089302" ->
 * "573138089302"). A number already carrying a country code (more than 10
 * digits) is left as-is. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.length <= 10 ? `57${digits}` : digits;
}

/** Builds a wa.me deep link pre-addressed to a Colombian customer with a
 * ready-to-send message. Opening it starts a chat FROM whoever clicks it —
 * there's no way to make WhatsApp actually send on its own without the
 * paid Business API, so this is the "one click, no cost" middle ground. */
export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

/** The store's own WhatsApp contact number (not a customer's), normalized
 * to the country-code-prefixed digits wa.me needs so every usage site can
 * drop it straight into a wa.me link without its own formatting. Prefers
 * the admin-editable site content field so it can be changed without a
 * redeploy; falls back to the env var for sites that set it the old way
 * and haven't filled the new admin field yet. */
export function getStoreWhatsAppNumber(content: Pick<SiteContent, 'site.whatsapp_number'>): string {
  return normalizePhone(content['site.whatsapp_number'] || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '');
}

export function buildOrderConfirmationMessage(order: {
  customerName: string;
  totalCents: number;
  paymentMethod: 'WOMPI' | 'COD';
  shippingAddress: string;
  shippingAddressComplement?: string | null;
  shippingCity: string;
  shippingDepartment?: string | null;
  items: { quantity: number; product: { name: string } }[];
}): string {
  const total = formatCOP(order.totalCents);
  const address = `${order.shippingAddress}${order.shippingAddressComplement ? `, ${order.shippingAddressComplement}` : ''}, ${order.shippingCity}${order.shippingDepartment ? `, ${order.shippingDepartment}` : ''}`;
  const paymentLine =
    order.paymentMethod === 'COD'
      ? `💵 Pagas ${total} contra entrega, en efectivo o con datáfono.`
      : `✅ Tu pago de ${total} ya fue confirmado.`;
  const productsLine =
    order.items.length === 1
      ? `${order.items[0].quantity}x ${order.items[0].product.name}`
      : order.items.map((i) => `• ${i.quantity}x ${i.product.name}`).join('\n');

  return [
    `👋 ¡Hola ${order.customerName}!`,
    ``,
    `Gracias por comprar en AFRA°.`,
    ``,
    `📦 Pedido confirmado:`,
    productsLine,
    ``,
    paymentLine,
    ``,
    `📍 Lo enviaremos a: ${address}`,
    ``,
    `¿Dudas? Escríbenos por acá 😊`,
  ].join('\n');
}

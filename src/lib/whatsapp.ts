import { formatCOP } from '@/lib/format';

/** Builds a wa.me deep link pre-addressed to a Colombian customer with a
 * ready-to-send message. Opening it starts a chat FROM whoever clicks it —
 * there's no way to make WhatsApp actually send on its own without the
 * paid Business API, so this is the "one click, no cost" middle ground. */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const withCountryCode = digits.length <= 10 ? `57${digits}` : digits;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
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
    `¡Hola ${order.customerName}! 🖤`,
    ``,
    `Gracias por comprar en AFRA°.`,
    ``,
    `🛍️ Pedido confirmado:`,
    productsLine,
    ``,
    paymentLine,
    ``,
    `📍 Lo enviaremos a: ${address}`,
    ``,
    `¿Dudas? Escríbenos por acá 😊`,
  ].join('\n');
}

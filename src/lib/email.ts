import { Resend } from 'resend';
import { getConfigValue } from '@/lib/config';
import type { Order, OrderItem, Product } from '@prisma/client';

type OrderWithItems = Order & { items: (OrderItem & { product: Product })[] };

export async function sendOrderConfirmationEmail(order: OrderWithItems) {
  const apiKey = await getConfigValue('RESEND_API_KEY');
  if (!apiKey) {
    console.warn('RESEND_API_KEY no configurado; se omite el correo de confirmación');
    return;
  }

  const resend = new Resend(apiKey);
  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0;color:#3A2E24;">${item.product.name} · Talla ${item.size} × ${item.quantity}</td></tr>`
    )
    .join('');

  const total = (order.totalCents / 100).toLocaleString('es-CO', { style: 'currency', currency: 'COP' });
  const isCod = order.paymentMethod === 'COD';

  await resend.emails.send({
    from: 'AFRA <pedidos@afra.co>',
    to: order.customerEmail,
    subject: isCod ? 'Tu pedido ha sido confirmado' : 'Tu compra ha sido exitosa',
    html: `
      <div style="font-family: -apple-system, sans-serif; background:#FDFCFA; padding:32px; color:#2A2119;">
        <h1 style="font-weight:600; letter-spacing:-0.02em;">Gracias por tu compra, ${order.customerName}</h1>
        <p style="font-size:16px; line-height:1.6;">
          ${
            isCod
              ? 'Tu pedido quedó confirmado con pago contra entrega. Lo enviaremos el día de mañana y pagas en efectivo o con datáfono cuando lo recibas.'
              : 'Tu compra ha sido exitosa. Tu producto será enviado el día de mañana y te compartiremos tu guía de seguimiento.'
          }
        </p>
        <table style="width:100%; margin:24px 0; border-top:1px solid #F1EADD; border-bottom:1px solid #F1EADD;">
          ${itemsHtml}
        </table>
        <p style="font-size:18px; font-weight:600;">Total${isCod ? ' a pagar en la entrega' : ''}: ${total}</p>
        <p style="font-size:14px; color:#4A3B2F;">Referencia de pedido: ${order.wompiReference}</p>
      </div>
    `,
  });
}

import { Resend } from 'resend';
import { getConfigValue } from '@/lib/config';
import { getSiteContent } from '@/lib/content';
import { getStoreWhatsAppNumber } from '@/lib/whatsapp';
import { orderShippingCents } from '@/lib/pricing';
import { formatCOP } from '@/lib/format';
import { isWhatsAppOrder } from '@/lib/orderSource';

export const DEFAULT_EMAIL_FROM = 'AFRA <pedidos@wearafra.com>';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wearafra.com').replace(/\/$/, '');

type OrderForEmail = {
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
  items: {
    quantity: number;
    size: string;
    color?: string | null;
    priceCents: number;
    product: { name: string; images?: string[] };
  }[];
};

export type EmailResult = { ok: true; id?: string } | { ok: false; error: string };

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function getEmailSettings() {
  const [apiKey, from] = await Promise.all([getConfigValue('RESEND_API_KEY'), getConfigValue('EMAIL_FROM')]);
  return { apiKey, from: from || DEFAULT_EMAIL_FROM };
}

/** Turns Resend's error into something the store owner can act on. */
function explainResendError(message: string): string {
  if (/domain.*not verified|verify a domain|not verified/i.test(message)) {
    return `El dominio del remitente no está verificado en Resend. Verifica wearafra.com en resend.com/domains (registros DNS) o usa un remitente de un dominio verificado. (${message})`;
  }
  if (/api key|unauthori[sz]ed|invalid_api_key/i.test(message)) {
    return `La API key de Resend no es válida. Crea una nueva en resend.com/api-keys y guárdala de nuevo. (${message})`;
  }
  if (/testing emails|own email address/i.test(message)) {
    return `Resend está en modo de prueba: solo deja enviar a tu propio correo hasta que verifiques el dominio. (${message})`;
  }
  return message;
}

export function buildOrderEmail(order: OrderForEmail, whatsappNumber: string) {
  const isCod = order.paymentMethod === 'COD';
  const firstName = esc(order.customerName.trim().split(/\s+/)[0] || order.customerName);
  const shippingCents = orderShippingCents(order);
  const address = [
    order.shippingAddress,
    order.shippingAddressComplement,
    [order.shippingCity, order.shippingDepartment].filter(Boolean).join(', '),
  ]
    .filter(Boolean)
    .map((line) => esc(line!))
    .join('<br>');

  const itemsHtml = order.items
    .map((item) => {
      const image = item.product.images?.[0];
      const detail = [`Talla ${item.size}`, item.color, item.quantity > 1 ? `${item.quantity} unidades` : null]
        .filter(Boolean)
        .join(' · ');
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #F1E6D2;width:64px;vertical-align:top;">
            ${
              image && /^https?:\/\//.test(image)
                ? `<img src="${esc(image)}" width="56" height="70" alt="" style="display:block;width:56px;height:70px;object-fit:cover;border-radius:8px;background:#F7EEDB;">`
                : `<div style="width:56px;height:70px;border-radius:8px;background:#F7EEDB;"></div>`
            }
          </td>
          <td style="padding:12px 12px;border-bottom:1px solid #F1E6D2;vertical-align:top;">
            <div style="font-size:15px;font-weight:600;color:#291C13;">${esc(item.product.name)}</div>
            <div style="font-size:13px;color:#83593D;margin-top:2px;">${esc(detail)}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #F1E6D2;vertical-align:top;text-align:right;white-space:nowrap;font-size:15px;color:#291C13;">
            ${formatCOP(item.priceCents * item.quantity)}
          </td>
        </tr>`;
    })
    .join('');

  const row = (label: string, value: string, color = '#4F3624') =>
    `<tr><td style="padding:4px 0;font-size:14px;color:${color};">${label}</td><td style="padding:4px 0;font-size:14px;color:${color};text-align:right;">${value}</td></tr>`;

  const steps = isCod
    ? [
        'Preparamos tu pedido y lo despachamos en 24 horas hábiles.',
        'Te enviamos el número de guía para que lo rastrees.',
        `Pagas ${formatCOP(order.totalCents)} en efectivo o datáfono cuando lo recibas.`,
      ]
    : [
        'Tu pago ya está confirmado.',
        'Despachamos tu pedido en 24 horas hábiles.',
        'Te enviamos el número de guía para que lo rastrees.',
      ];

  const waLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola, tengo una pregunta sobre mi pedido ${order.wompiReference}`)}`
    : '';

  const subject = isCod
    ? `Pedido confirmado ${order.wompiReference} · AFRA`
    : `Pago recibido · tu pedido ${order.wompiReference} · AFRA`;

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#FBF6EC;">
  <div style="display:none;max-height:0;overflow:hidden;">${isCod ? 'Recibimos tu pedido. Pagas al recibir.' : 'Tu pago fue aprobado.'} Total ${formatCOP(order.totalCents)}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF6EC;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <a href="${SITE_URL}" style="font-size:26px;font-weight:800;letter-spacing:0.18em;color:#291C13;text-decoration:none;">AFRA</a>
        </td></tr>
        <tr><td style="background:#FFFFFF;border-radius:20px;padding:32px 28px;">
          <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#83593D;">Pedido ${esc(order.wompiReference)}</div>
          <h1 style="margin:8px 0 0;font-size:26px;line-height:1.25;color:#291C13;letter-spacing:-0.02em;">
            ${isCod ? `¡Gracias, ${firstName}! Tu pedido está confirmado.` : `¡Gracias, ${firstName}! Recibimos tu pago.`}
          </h1>
          <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#4F3624;">
            ${
              isCod
                ? 'Ya estamos preparando tu pedido. Pagas en efectivo o con datáfono cuando lo recibas.'
                : 'Tu compra está lista y la despachamos en las próximas 24 horas hábiles.'
            }
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid #F1E6D2;">
            ${itemsHtml}
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
            ${row('Subtotal', formatCOP(order.subtotalCents))}
            ${order.discountCents > 0 ? row(`Descuento${order.couponCode ? ` (${esc(order.couponCode)})` : ''}`, `-${formatCOP(order.discountCents)}`, '#15803D') : ''}
            ${row('Envío', shippingCents > 0 ? formatCOP(shippingCents) : 'Gratis', shippingCents > 0 ? '#4F3624' : '#15803D')}
            <tr><td style="padding:12px 0 0;border-top:1px solid #F1E6D2;font-size:16px;font-weight:700;color:#291C13;">${isCod ? 'Total a pagar al recibir' : 'Total pagado'}</td>
            <td style="padding:12px 0 0;border-top:1px solid #F1E6D2;font-size:20px;font-weight:700;color:#291C13;text-align:right;">${formatCOP(order.totalCents)}</td></tr>
          </table>

          <div style="margin-top:28px;padding:18px 20px;background:#FBF6EC;border-radius:14px;">
            <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#83593D;">Lo enviamos a</div>
            <div style="margin-top:6px;font-size:15px;line-height:1.55;color:#291C13;">
              <strong>${esc(order.customerName)}</strong><br>${address}<br>Tel. ${esc(order.shippingPhone)}
            </div>
            ${order.deliveryNotes ? `<div style="margin-top:8px;font-size:13px;color:#83593D;">Indicaciones: ${esc(order.deliveryNotes)}</div>` : ''}
          </div>

          <div style="margin-top:24px;">
            <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#83593D;">Qué sigue</div>
            <ol style="margin:10px 0 0;padding-left:20px;font-size:15px;line-height:1.7;color:#4F3624;">
              ${steps.map((s) => `<li>${s}</li>`).join('')}
            </ol>
          </div>

          ${
            waLink
              ? `<div style="margin-top:28px;text-align:center;">
                  <a href="${waLink}" style="display:inline-block;background:#291C13;color:#FBF6EC;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:999px;">¿Dudas? Escríbenos por WhatsApp</a>
                </div>`
              : ''
          }
        </td></tr>
        <tr><td style="padding:20px 8px 0;text-align:center;font-size:12px;line-height:1.6;color:#83593D;">
          Recibiste este correo porque hiciste un pedido en <a href="${SITE_URL}" style="color:#83593D;">wearafra.com</a>.<br>
          Guarda este correo: el número de pedido te sirve para cualquier consulta.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    isCod ? `¡Gracias, ${order.customerName}! Tu pedido está confirmado.` : `¡Gracias, ${order.customerName}! Recibimos tu pago.`,
    `Pedido: ${order.wompiReference}`,
    '',
    ...order.items.map((i) => `• ${i.quantity} x ${i.product.name} — Talla ${i.size}${i.color ? `, ${i.color}` : ''} (${formatCOP(i.priceCents * i.quantity)})`),
    '',
    `Subtotal: ${formatCOP(order.subtotalCents)}`,
    order.discountCents > 0 ? `Descuento: -${formatCOP(order.discountCents)}` : null,
    `Envío: ${shippingCents > 0 ? formatCOP(shippingCents) : 'Gratis'}`,
    `${isCod ? 'Total a pagar al recibir' : 'Total pagado'}: ${formatCOP(order.totalCents)}`,
    '',
    `Lo enviamos a: ${[order.shippingAddress, order.shippingAddressComplement, order.shippingCity, order.shippingDepartment].filter(Boolean).join(', ')}`,
    '',
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    waLink ? `\n¿Dudas? ${waLink}` : null,
  ]
    .filter((l) => l !== null)
    .join('\n');

  return { subject, html, text };
}

export async function sendOrderEmail(order: OrderForEmail, to = order.customerEmail): Promise<EmailResult> {
  if (!to) return { ok: false, error: 'El pedido no tiene correo del cliente.' };
  const { apiKey, from } = await getEmailSettings();
  if (!apiKey) return { ok: false, error: 'Falta la API key de Resend.' };

  const content = await getSiteContent();
  const { subject, html, text } = buildOrderEmail(order, getStoreWhatsAppNumber(content));
  try {
    // Resend reports failures in the result instead of throwing.
    const { data, error } = await new Resend(apiKey).emails.send({ from, to, subject, html, text });
    if (error) return { ok: false, error: explainResendError(error.message) };
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: explainResendError(err instanceof Error ? err.message : String(err)) };
  }
}

/** Confirmation to the shopper once an order is committed (COD at creation,
 * Wompi when paid). Never throws: a failed email must not fail the order. */
export async function sendOrderConfirmationEmail(order: OrderForEmail) {
  if (isWhatsAppOrder(order.wompiReference)) return;
  const result = await sendOrderEmail(order);
  if (!result.ok) console.error(`Correo de confirmación no enviado (${order.wompiReference}): ${result.error}`);
}

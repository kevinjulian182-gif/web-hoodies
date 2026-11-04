import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireRole } from '@/lib/auth';
import { sendCustomerWhatsApp } from '@/lib/orderNotify';
import { buildOrderConfirmationMessage } from '@/lib/whatsapp';

const schema = z.object({ phone: z.string().trim().min(7, 'Escribe un celular.') });

// Sends the customer's WhatsApp confirmation to a number of the owner's
// choosing, so they see the exact message and any TextMeBot error.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Celular inválido' }, { status: 400 });
  }
  const message = buildOrderConfirmationMessage({
    customerName: 'Cliente de prueba',
    wompiReference: 'AFRA-PRUEBA',
    totalCents: 20790000,
    paymentMethod: 'COD',
    shippingAddress: 'Calle 45 # 12-30',
    shippingAddressComplement: 'Apto 501',
    shippingCity: 'Medellín',
    shippingDepartment: 'Antioquia',
    items: [{ quantity: 1, size: 'M', color: 'Negro', product: { name: 'Hoodie de prueba' } }],
  });
  const result = await sendCustomerWhatsApp(parsed.data.phone, message);
  return NextResponse.json(result.ok ? { ok: true } : { error: result.error }, { status: result.ok ? 200 : 502 });
}

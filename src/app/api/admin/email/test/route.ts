import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireRole } from '@/lib/auth';
import { sendOrderEmail } from '@/lib/email';

const schema = z.object({ to: z.string().trim().email('Escribe un correo válido.') });

// Sends a sample confirmation so the owner sees exactly what shoppers get,
// and surfaces Resend's error (unverified domain, bad key…) if it fails.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Correo inválido' }, { status: 400 });
  }
  const result = await sendOrderEmail(
    {
      wompiReference: 'AFRA-PRUEBA',
      customerName: 'Cliente de prueba',
      customerEmail: parsed.data.to,
      shippingPhone: '300 123 4567',
      shippingAddress: 'Calle 45 # 12-30',
      shippingAddressComplement: 'Apto 501',
      shippingCity: 'Medellín',
      shippingDepartment: 'Antioquia',
      paymentMethod: 'COD',
      subtotalCents: 18990000,
      discountCents: 0,
      totalCents: 18990000 + 1800000,
      items: [{ quantity: 1, size: 'M', color: 'Negro', priceCents: 18990000, product: { name: 'Hoodie de prueba' } }],
    },
    parsed.data.to
  );
  return NextResponse.json(result.ok ? result : { error: result.error }, { status: result.ok ? 200 : 502 });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { orderHoldsStock, takeOrderStock } from '@/lib/stock';
import { sendShippedEmail } from '@/lib/email';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';

const schema = z.object({
  trackingNumber: z.string().trim().min(1),
  carrier: z.string().min(1).default('Inter Rapidísimo'),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

  // Orders placed before stock was taken at order time (old WhatsApp
  // orders) take their units when they ship.
  if (!orderHoldsStock(existing)) {
    const slugs = await takeOrderStock(id);
    revalidateProductListings();
    for (const slug of new Set(slugs)) revalidateProduct(slug);
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      trackingNumber: parsed.data.trackingNumber,
      carrier: parsed.data.carrier,
      status: 'SHIPPED',
      shippedAt: new Date(),
    },
    include: { items: { include: { product: { select: { name: true } } } } },
  });

  // The customer gets their tracking number by email (only when it's new or
  // changed, so re-saving the same guide doesn't send it twice).
  const email =
    existing.trackingNumber === order.trackingNumber && existing.status === 'SHIPPED'
      ? null
      : order.customerEmail
        ? await sendShippedEmail({ ...order, trackingNumber: order.trackingNumber! })
        : { ok: false as const, error: 'El pedido no tiene correo del cliente.' };

  return NextResponse.json({ ...order, email });
}

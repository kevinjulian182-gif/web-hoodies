import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { orderHoldsStock, releaseOrderStock, takeOrderStock } from '@/lib/stock';
import { sendShippedEmail } from '@/lib/email';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';
import { getTrackingApiKey, refreshOrderTracking } from '@/lib/tracking';

const schema = z.object({
  status: z.enum(['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  trackingNumber: z.string().trim().max(60).nullable().optional(),
});

const refreshListings = (slugs: string[]) => {
  if (!slugs.length) return;
  revalidateProductListings();
  for (const slug of new Set(slugs)) revalidateProduct(slug);
};

/** Moves an order through pendiente → enviado → entregado (or cancelado)
 * and keeps its guía, its stock and the customer's shipping email in step. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  const { status: target, trackingNumber: guide } = parsed.data;

  const { id } = await params;
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  if (existing.status === 'CANCELLED' && target && target !== 'CANCELLED') {
    return NextResponse.json({ error: 'Un pedido cancelado no se puede reabrir: regístralo de nuevo.' }, { status: 400 });
  }

  const trackingNumber = guide === undefined ? existing.trackingNumber : guide || null;
  const guideChanged = trackingNumber !== existing.trackingNumber;
  const data: Record<string, unknown> = {};
  if (guideChanged) Object.assign(data, { trackingNumber, trackingStatus: null, trackingCheckedAt: null });

  let slugs: string[] = [];
  if (target && target !== existing.status) {
    if (target === 'SHIPPED' && !trackingNumber) {
      return NextResponse.json({ error: 'Escribe el número de guía para marcarlo como enviado.' }, { status: 400 });
    }
    if (target === 'CANCELLED') {
      // Its units go back to the store (a returned package comes back too).
      if (orderHoldsStock(existing)) slugs = await releaseOrderStock(id);
    } else if (!orderHoldsStock(existing)) {
      // Old orders that never took stock take it once they're real.
      slugs = await takeOrderStock(id);
    }

    if (target === 'PENDING') {
      const paid = existing.paymentMethod === 'TRANSFER' || (existing.paymentMethod === 'WOMPI' && existing.wompiTransactionId);
      Object.assign(data, { status: paid ? 'PAID' : 'PENDING', deliveredAt: null });
    } else if (target === 'SHIPPED') {
      Object.assign(data, { status: 'SHIPPED', shippedAt: existing.shippedAt ?? new Date(), deliveredAt: null });
    } else if (target === 'DELIVERED') {
      Object.assign(data, { status: 'DELIVERED', shippedAt: existing.shippedAt ?? new Date(), deliveredAt: new Date() });
    } else {
      Object.assign(data, { status: 'CANCELLED' });
    }
  }

  const order = await prisma.order.update({
    where: { id },
    data,
    include: {
      items: { include: { product: { select: { name: true, slug: true, images: true, colorImages: true } } } },
      creditPayments: { select: { amountCents: true } },
    },
  });
  refreshListings(slugs);

  // The customer hears about the guía when the order ships or its guía changes.
  let email: { ok: boolean; error?: string } | null = null;
  const nowShipped = order.status === 'SHIPPED' && (existing.status !== 'SHIPPED' || guideChanged);
  if (nowShipped && order.trackingNumber) {
    email = order.customerEmail
      ? await sendShippedEmail({ ...order, trackingNumber: order.trackingNumber })
      : { ok: false, error: 'El pedido no tiene correo del cliente.' };
    if (await getTrackingApiKey()) after(() => refreshOrderTracking(order).catch(() => {}));
  }

  return NextResponse.json({ order, email });
}

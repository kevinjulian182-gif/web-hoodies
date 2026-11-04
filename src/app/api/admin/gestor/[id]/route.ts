import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import {
  buildStockDecrementOps,
  buildStockRestoreOps,
  checkStock,
  orderHoldsStock,
  releaseOrderStock,
  takeOrderStock,
  type ProductWithVariants,
} from '@/lib/stock';
import { variantKey } from '@/lib/variants';
import { editOrderSchema } from '@/lib/manualOrder';
import { sendShippedEmail } from '@/lib/email';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';
import { getTrackingApiKey, refreshOrderTracking } from '@/lib/tracking';

const schema = z.object({
  status: z.enum(['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  trackingNumber: z.string().trim().max(60).nullable().optional(),
  // The guía was just sent to the buyer over WhatsApp.
  whatsappTrackingSent: z.literal(true).optional(),
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
  const { status: target, trackingNumber: guide, whatsappTrackingSent } = parsed.data;

  const { id } = await params;
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  if (existing.status === 'CANCELLED' && target && target !== 'CANCELLED') {
    return NextResponse.json({ error: 'Un pedido cancelado no se puede reabrir: regístralo de nuevo.' }, { status: 400 });
  }

  const trackingNumber = guide === undefined ? existing.trackingNumber : guide || null;
  const guideChanged = trackingNumber !== existing.trackingNumber;
  const data: Record<string, unknown> = {};
  if (guideChanged) Object.assign(data, { trackingNumber, trackingStatus: null, trackingCheckedAt: null, whatsappTrackingSentAt: null });
  if (whatsappTrackingSent && trackingNumber) data.whatsappTrackingSentAt = new Date();

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

const ORDER_INCLUDE = {
  items: { include: { product: { select: { name: true, slug: true, images: true, colorImages: true } } } },
  creditPayments: { select: { amountCents: true } },
} as const;

const customerSchema = editOrderSchema.pick({
  customerName: true,
  shippingPhone: true,
  customerDocument: true,
  customerEmail: true,
  shippingAddress: true,
  shippingAddressComplement: true,
  shippingCity: true,
  shippingDepartment: true,
  deliveryNotes: true,
});

/** Fixes an order typed in wrong: customer, address, products, payment and
 * prices. Its units move with it: the old ones go back to the inventory and
 * the new ones are taken. Web orders paid online only change their customer
 * and delivery data (the charge is already made). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.order.findUnique({ where: { id }, include: { items: true, creditPayments: true } });
  if (!existing) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  if (existing.status === 'CANCELLED') return NextResponse.json({ error: 'Un pedido cancelado no se puede editar.' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const customerParsed = customerSchema.safeParse(body);
  if (!customerParsed.success) {
    return NextResponse.json({ error: customerParsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  const c = customerParsed.data;
  const customerData = {
    customerName: c.customerName,
    customerEmail: c.customerEmail,
    customerDocument: c.customerDocument || null,
    shippingPhone: c.shippingPhone,
    shippingAddress: c.shippingAddress,
    shippingAddressComplement: c.shippingAddressComplement || null,
    shippingCity: c.shippingCity,
    shippingDepartment: c.shippingDepartment || null,
    deliveryNotes: c.deliveryNotes || null,
  };

  if (existing.paymentMethod === 'WOMPI') {
    const order = await prisma.order.update({ where: { id }, data: customerData, include: ORDER_INCLUDE });
    return NextResponse.json({ order });
  }

  const parsed = editOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const data = parsed.data;
  const items = data.items.map((i) => ({ ...i, color: i.color || undefined }));
  const subtotalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
  const discountCents = Math.min(data.discountCents, subtotalCents);
  const totalCents = subtotalCents - discountCents + data.shippingCents;

  const paidCents = existing.creditPayments.reduce((sum, p) => sum + p.amountCents, 0);
  if (paidCents > 0 && data.paymentMethod !== 'CREDIT') {
    return NextResponse.json({ error: 'Este fiado ya tiene abonos: quítalos en Cuentas › Fiados antes de cambiar el pago.' }, { status: 400 });
  }
  if (data.paymentMethod === 'CREDIT' && totalCents < paidCents) {
    return NextResponse.json({ error: 'El total no puede quedar por debajo de lo que ya abonó.' }, { status: 400 });
  }

  const ids = [...new Set([...existing.items.map((i) => i.productId), ...items.map((i) => i.productId)])];
  const products = await prisma.product.findMany({ where: { id: { in: ids } }, include: { variants: true } });
  const productMap = new Map<string, ProductWithVariants>(products.map((p) => [p.id, p]));
  if (items.some((i) => !productMap.has(i.productId))) {
    return NextResponse.json({ error: 'Uno de los productos ya no existe.' }, { status: 400 });
  }

  const holds = orderHoldsStock(existing);
  const oldLines = existing.items.map((i) => ({ productId: i.productId, size: i.size, color: i.color ?? undefined, quantity: i.quantity }));
  if (holds) {
    // Check the new lines as if this order's own units were already back.
    const available = new Map<string, ProductWithVariants>(
      products.map((p) => [p.id, { ...p, variants: p.variants.map((v) => ({ ...v })) }])
    );
    for (const line of oldLines) {
      const p = available.get(line.productId);
      if (!p) continue;
      p.stock += line.quantity;
      const v = p.variants.find((x) => variantKey(x.size, x.color) === variantKey(line.size, line.color ?? null));
      if (v) v.stock += line.quantity;
    }
    const stockError = checkStock(available, items);
    if (stockError) return NextResponse.json({ error: `${stockError}.` }, { status: 409 });
  }

  const status =
    existing.status === 'PENDING' || existing.status === 'PAID'
      ? data.paymentMethod === 'TRANSFER'
        ? 'PAID'
        : 'PENDING'
      : existing.status;

  const results = await prisma.$transaction([
    ...(holds ? buildStockRestoreOps(productMap, oldLines) : []),
    ...(holds ? buildStockDecrementOps(productMap, items) : []),
    prisma.orderItem.deleteMany({ where: { orderId: id } }),
    prisma.order.update({
      where: { id },
      data: {
        ...customerData,
        paymentMethod: data.paymentMethod,
        status,
        subtotalCents,
        discountCents,
        totalCents,
        items: { create: items.map(({ productId, size, color, quantity, priceCents }) => ({ productId, size, color, quantity, priceCents })) },
      },
      include: ORDER_INCLUDE,
    }),
  ]);
  refreshListings(products.map((p) => p.slug));
  return NextResponse.json({ order: results[results.length - 1] });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { buildStockDecrementOps, type ProductWithVariants } from '@/lib/stock';
import { isWhatsAppOrder } from '@/lib/orderSource';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';

const schema = z.object({
  trackingNumber: z.string().min(1),
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

  // A WhatsApp order was never charged against stock (it was only an intent
  // until confirmed in the chat): shipping it is when its units leave.
  const existing = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: { include: { variants: true } } } } },
  });
  if (existing && isWhatsAppOrder(existing.wompiReference) && existing.status === 'PENDING') {
    const productMap = new Map<string, ProductWithVariants>(existing.items.map((item) => [item.productId, item.product]));
    await prisma.$transaction(
      buildStockDecrementOps(
        productMap,
        existing.items.map((item) => ({ productId: item.productId, size: item.size, color: item.color ?? undefined, quantity: item.quantity }))
      )
    );
    revalidateProductListings();
    for (const product of productMap.values()) revalidateProduct(product.slug);
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      trackingNumber: parsed.data.trackingNumber,
      carrier: parsed.data.carrier,
      status: 'SHIPPED',
      shippedAt: new Date(),
    },
  });

  return NextResponse.json(order);
}

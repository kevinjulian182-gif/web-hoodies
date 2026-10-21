import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWompiWebhook } from '@/lib/wompi';
import { notifyOrderConfirmed } from '@/lib/orderNotify';
import { orderHoldsStock, releaseOrderStock, takeOrderStock } from '@/lib/stock';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';

export async function POST(req: NextRequest) {
  const event = await req.json();

  const isValid = await verifyWompiWebhook(event);
  if (!isValid) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  const { transaction } = event.data;
  const order = await prisma.order.findUnique({
    where: { wompiReference: transaction.reference },
    include: { items: { include: { product: { include: { variants: true } } } } },
  });
  if (!order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  // A paid order whose reservation had already been released (declined
  // retry, or left past the hold window) takes its units again.
  if (transaction.status === 'APPROVED' && (order.status === 'PENDING' || order.status === 'CANCELLED')) {
    const holds = orderHoldsStock(order);
    const { count } = await prisma.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: 'PAID', wompiTransactionId: transaction.id },
    });
    if (count === 1) {
      const slugs = holds ? [] : await takeOrderStock(order.id);
      if (slugs.length) {
        revalidateProductListings();
        for (const slug of new Set(slugs)) revalidateProduct(slug);
      }
      // A Wompi order only counts once it's paid — that's when the store hears about it.
      after(() => notifyOrderConfirmed(order));
    }
  } else if ((transaction.status === 'DECLINED' || transaction.status === 'ERROR') && order.status === 'PENDING') {
    const holds = orderHoldsStock(order);
    const { count } = await prisma.order.updateMany({
      where: { id: order.id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    if (count === 1 && holds) {
      const slugs = await releaseOrderStock(order.id);
      revalidateProductListings();
      for (const slug of new Set(slugs)) revalidateProduct(slug);
    }
  }

  return NextResponse.json({ ok: true });
}

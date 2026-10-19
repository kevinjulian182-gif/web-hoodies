import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { orderHoldsStock, releaseOrderStock } from '@/lib/stock';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  return NextResponse.json(order);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  // A deleted order that hadn't shipped gives its units back to the store.
  const order = await prisma.order.findUnique({ where: { id } });
  if (order && order.status !== 'SHIPPED' && orderHoldsStock(order)) {
    const slugs = await releaseOrderStock(id);
    revalidateProductListings();
    for (const slug of new Set(slugs)) revalidateProduct(slug);
  }
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

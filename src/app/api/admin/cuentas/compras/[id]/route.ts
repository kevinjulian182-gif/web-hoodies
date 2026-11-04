import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';

/** Deletes a purchase; units it added to the inventory are taken back out. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const purchase = await prismaInternal.purchase.findUnique({ where: { id }, include: { items: true } });
  if (!purchase) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  const stocked = purchase.addedToStock ? purchase.items.filter((i) => i.productId) : [];
  const products = await prismaInternal.product.findMany({
    where: { id: { in: stocked.map((i) => i.productId!) } },
    select: { id: true, slug: true, _count: { select: { variants: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const i of stocked) {
    const p = byId.get(i.productId!);
    if (!p) continue;
    ops.push(prismaInternal.product.update({ where: { id: p.id }, data: { stock: { decrement: i.quantity } } }));
    if (p._count.variants) {
      ops.push(
        prismaInternal.productVariant.updateMany({
          where: { productId: p.id, size: i.size ?? '', color: i.color },
          data: { stock: { decrement: i.quantity } },
        })
      );
    }
  }
  ops.push(prismaInternal.purchase.delete({ where: { id } }));
  await prismaInternal.$transaction(ops);

  if (products.length) {
    revalidateProductListings();
    for (const p of products) revalidateProduct(p.slug);
  }
  return NextResponse.json({ ok: true });
}

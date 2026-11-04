import { NextRequest, NextResponse } from 'next/server';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';
import { costOps, loadPurchaseProducts, normalizeLines, purchaseFields, purchaseSchema, stockOps } from '@/lib/purchases';

const refresh = (slugs: string[]) => {
  if (!slugs.length) return;
  revalidateProductListings();
  for (const slug of new Set(slugs)) revalidateProduct(slug);
};

/** Edits a purchase. Units the old version added to the inventory are taken
 * back out and the new version's units are added, in one transaction, so
 * the stock always matches what the purchase says now. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const previous = await prismaInternal.purchase.findUnique({ where: { id }, include: { items: true } });
  if (!previous) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });

  const parsed = purchaseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const data = parsed.data;
  const lines = normalizeLines(data.items);
  const oldLines = previous.addedToStock ? previous.items : [];

  const { byId, error } = await loadPurchaseProducts(lines, data.addToStock, oldLines.flatMap((l) => (l.productId ? [l.productId] : [])));
  if (error) return NextResponse.json({ error }, { status: 400 });

  const takeBack = stockOps(oldLines, byId, -1);
  const results = await prismaInternal.$transaction([
    ...takeBack,
    prismaInternal.purchaseItem.deleteMany({ where: { purchaseId: id } }),
    prismaInternal.purchase.update({ where: { id }, data: { ...purchaseFields(data, lines), items: { create: lines } } }),
    ...(data.addToStock ? stockOps(lines, byId, 1) : []),
    ...(data.updateCost ? costOps(lines, byId) : []),
  ]);

  refresh([...byId.values()].map((p) => p.slug));
  return NextResponse.json(results[takeBack.length + 1]);
}

/** Deletes a purchase; units it added to the inventory are taken back out. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const purchase = await prismaInternal.purchase.findUnique({ where: { id }, include: { items: true } });
  if (!purchase) return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });

  const oldLines = purchase.addedToStock ? purchase.items : [];
  const { byId } = await loadPurchaseProducts([], false, oldLines.flatMap((l) => (l.productId ? [l.productId] : [])));
  await prismaInternal.$transaction([...stockOps(oldLines, byId, -1), prismaInternal.purchase.delete({ where: { id } })]);

  refresh([...byId.values()].map((p) => p.slug));
  return NextResponse.json({ ok: true });
}

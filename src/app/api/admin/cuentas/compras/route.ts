import { NextRequest, NextResponse } from 'next/server';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';
import { costOps, loadPurchaseProducts, normalizeLines, purchaseFields, purchaseSchema, stockOps } from '@/lib/purchases';

/** Registers merchandise bought from a supplier; its store products can go
 * straight into the inventory and update their cost. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = purchaseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const data = parsed.data;
  const lines = normalizeLines(data.items);

  const { byId, error } = await loadPurchaseProducts(lines, data.addToStock);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const [purchase] = await prismaInternal.$transaction([
    prismaInternal.purchase.create({ data: { ...purchaseFields(data, lines), items: { create: lines } } }),
    ...(data.addToStock ? stockOps(lines, byId, 1) : []),
    ...(data.updateCost ? costOps(lines, byId) : []),
  ]);

  if (data.addToStock && byId.size) {
    revalidateProductListings();
    for (const p of byId.values()) revalidateProduct(p.slug);
  }
  return NextResponse.json(purchase, { status: 201 });
}

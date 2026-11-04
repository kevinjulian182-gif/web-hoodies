import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { variantKey } from '@/lib/variants';
import { PAYMENT_METHODS, TZ_OFFSET } from '@/lib/accountingConfig';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supplier: z.string().trim().min(2, 'Escribe el proveedor.'),
  invoiceNumber: z.string().trim().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z.string().trim().optional(),
  addToStock: z.boolean().default(true),
  updateCost: z.boolean().default(true),
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        description: z.string().trim().min(1, 'Describe cada artículo.'),
        size: z.string().optional(),
        color: z.string().optional(),
        quantity: z.number().int().min(1),
        unitCostCents: z.number().int().min(0),
      })
    )
    .min(1, 'Agrega al menos un artículo.'),
});

/** Registers merchandise bought from a supplier; its store products can go
 * straight into the inventory and update their cost. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const data = parsed.data;
  const items = data.items.map((i) => ({ ...i, productId: i.productId || null, size: i.size || null, color: i.color || null }));

  const ids = [...new Set(items.flatMap((i) => (i.productId ? [i.productId] : [])))];
  const products = await prismaInternal.product.findMany({ where: { id: { in: ids } }, include: { variants: true } });
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const i of items) {
    if (!i.productId) continue;
    const p = byId.get(i.productId);
    if (!p) return NextResponse.json({ error: 'Uno de los productos ya no existe.' }, { status: 400 });
    if (data.addToStock && p.sizes.length && !p.sizes.includes(i.size ?? '')) {
      return NextResponse.json({ error: `Elige la talla de ${p.name}.` }, { status: 400 });
    }
    if (data.addToStock && p.colors.length && !p.colors.includes(i.color ?? '')) {
      return NextResponse.json({ error: `Elige el color de ${p.name}.` }, { status: 400 });
    }
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prismaInternal.purchase.create({
      data: {
        date: new Date(`${data.date}T12:00:00${TZ_OFFSET}`),
        supplier: data.supplier,
        invoiceNumber: data.invoiceNumber || null,
        paymentMethod: data.paymentMethod,
        notes: data.notes || null,
        totalCents: items.reduce((sum, i) => sum + i.unitCostCents * i.quantity, 0),
        addedToStock: data.addToStock && items.some((i) => i.productId),
        items: { create: items },
      },
    }),
  ];

  const touched = new Set<string>();
  for (const i of items) {
    if (!i.productId) continue;
    const p = byId.get(i.productId)!;
    if (data.addToStock) {
      touched.add(p.id);
      ops.push(prismaInternal.product.update({ where: { id: p.id }, data: { stock: { increment: i.quantity } } }));
      if (p.variants.length) {
        const exists = p.variants.some((v) => variantKey(v.size, v.color) === variantKey(i.size ?? '', i.color));
        ops.push(
          exists
            ? prismaInternal.productVariant.updateMany({
                where: { productId: p.id, size: i.size ?? '', color: i.color },
                data: { stock: { increment: i.quantity } },
              })
            : prismaInternal.productVariant.create({ data: { productId: p.id, size: i.size ?? '', color: i.color, stock: i.quantity } })
        );
      }
    }
    if (data.updateCost && i.unitCostCents > 0) {
      ops.push(prismaInternal.product.update({ where: { id: p.id }, data: { costCents: i.unitCostCents } }));
    }
  }

  const [purchase] = await prismaInternal.$transaction(ops);
  if (touched.size) {
    revalidateProductListings();
    for (const id of touched) revalidateProduct(byId.get(id)!.slug);
  }
  return NextResponse.json(purchase, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  category: z.string().optional().nullable(),
  description: z.string().min(1).optional(),
  materials: z.string().optional().nullable(),
  details: z.string().optional().nullable(),
  careInstructions: z.string().optional().nullable(),
  priceCents: z.number().int().positive().optional(),
  compareAtPriceCents: z.number().int().positive().nullable().optional(),
  costCents: z.number().int().min(0).nullable().optional(),
  images: z.array(z.string().url()).optional(),
  colorImages: z.record(z.string(), z.array(z.string().url())).optional(),
  colorHex: z.record(z.string(), z.string().regex(/^#[0-9a-fA-F]{6}$/)).optional(),
  videos: z.array(z.string().url()).optional(),
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  variants: z
    .array(z.object({ size: z.string(), color: z.string().nullable(), stock: z.number().int().min(0) }))
    .optional(),
  active: z.boolean().optional(),
  isPromo: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const { variants, ...data } = parsed.data;

  // Toggles like `active`/`isPromo` PATCH without ever sending `variants` —
  // only touch stock and replace the variant rows when the form actually
  // submitted a matrix (full product edit), not on a quick list-row toggle.
  const product =
    variants === undefined
      ? await prisma.product.update({ where: { id }, data })
      : await prisma.$transaction(async (tx) => {
          await tx.productVariant.deleteMany({ where: { productId: id } });
          const stock = variants.reduce((sum, v) => sum + v.stock, 0);
          return tx.product.update({
            where: { id },
            data: { ...data, stock, variants: { create: variants } },
            include: { variants: true },
          });
        });
  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;

  // A product with order history can't be removed (OrderItem.productId is
  // a required FK) — deleting it would also erase what was actually sold.
  // Deactivating keeps the record for past orders while hiding it from
  // the storefront.
  const orderCount = await prisma.orderItem.count({ where: { productId: id } });
  if (orderCount > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar: el producto tiene pedidos asociados. Desactívalo en su lugar.' },
      { status: 409 }
    );
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

const patchSchema = z.object({ logoUrl: z.string().url().nullable() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const brand = await prismaInternal.brand.update({ where: { id }, data: { logoUrl: parsed.data.logoUrl } });
  return NextResponse.json(brand);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const brand = await prismaInternal.brand.findUnique({ where: { id } });
  if (!brand) {
    return NextResponse.json({ error: 'Marca no encontrada' }, { status: 404 });
  }

  const productCount = await prismaInternal.product.count({ where: { brand: brand.name } });
  if (productCount > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: ${productCount} producto${productCount === 1 ? '' : 's'} usan esta marca.` },
      { status: 409 }
    );
  }

  await prismaInternal.brand.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const category = await prismaInternal.category.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
  }

  const productCount = await prismaInternal.product.count({ where: { category: category.name } });
  if (productCount > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: ${productCount} producto${productCount === 1 ? '' : 's'} usan esta categoría.` },
      { status: 409 }
    );
  }

  await prismaInternal.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

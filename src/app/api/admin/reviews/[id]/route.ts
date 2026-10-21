import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { revalidateProduct } from '@/lib/revalidate';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const deleted = await prisma.review.delete({ where: { id }, include: { product: { select: { slug: true } } } });
  revalidateProduct(deleted.product.slug);
  return NextResponse.json({ ok: true });
}

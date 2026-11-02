import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

// The store's live inventory, for picking products when registering an order.
export async function GET() {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const products = await prisma.product.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      brand: true,
      priceCents: true,
      images: true,
      sizes: true,
      colors: true,
      stock: true,
      active: true,
      variants: { select: { size: true, color: true, stock: true } },
    },
  });
  return NextResponse.json(products.map(({ images, ...p }) => ({ ...p, image: images[0] ?? null })));
}

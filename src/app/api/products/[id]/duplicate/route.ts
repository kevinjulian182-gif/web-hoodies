import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const original = await prisma.product.findUnique({ where: { id } });
  if (!original) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  let slug = `${original.slug}-copia`;
  let suffix = 2;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${original.slug}-copia-${suffix}`;
    suffix += 1;
  }

  const copy = await prisma.product.create({
    data: {
      name: `${original.name} (copia)`,
      slug,
      brand: original.brand,
      description: original.description,
      priceCents: original.priceCents,
      images: original.images,
      videos: original.videos,
      sizes: original.sizes,
      colors: original.colors,
      stock: original.stock,
      active: false,
    },
  });

  return NextResponse.json(copy, { status: 201 });
}

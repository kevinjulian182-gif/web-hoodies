import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const original = await prismaInternal.product.findUnique({ where: { id }, include: { variants: true } });
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
      category: original.category,
      description: original.description,
      materials: original.materials,
      details: original.details,
      careInstructions: original.careInstructions,
      priceCents: original.priceCents,
      compareAtPriceCents: original.compareAtPriceCents,
      costCents: original.costCents,
      images: original.images,
      colorImages: original.colorImages ?? undefined,
      colorHex: original.colorHex ?? undefined,
      videos: original.videos,
      sizes: original.sizes,
      colors: original.colors,
      stock: original.stock,
      active: false,
      isPromo: false,
      variants: {
        create: original.variants.map((v) => ({ size: v.size, color: v.color, stock: v.stock })),
      },
    },
  });

  return NextResponse.json(copy, { status: 201 });
}

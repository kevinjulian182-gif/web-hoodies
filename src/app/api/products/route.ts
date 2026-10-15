import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma, prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';
import { sizeChartSchema, toSizeChartData } from '@/lib/sizeChartSchema';

export async function GET() {
  const session = await getSession();
  const isStaff = requireRole(session, ['ADMIN', 'SUPER_ADMIN']);
  const products = await (isStaff ? prismaInternal : prisma).product.findMany({
    where: isStaff ? {} : { active: true },
    orderBy: { createdAt: 'desc' },
    include: { variants: true },
  });
  return NextResponse.json(products);
}

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().optional().nullable(),
  description: z.string().min(1),
  materials: z.string().optional().nullable(),
  details: z.string().optional().nullable(),
  careInstructions: z.string().optional().nullable(),
  priceCents: z.number().int().positive(),
  compareAtPriceCents: z.number().int().positive().nullable().optional(),
  costCents: z.number().int().min(0).nullable().optional(),
  images: z.array(z.string().url()).min(1),
  colorImages: z.record(z.string(), z.array(z.string().url())).optional(),
  colorHex: z.record(z.string(), z.string().regex(/^#[0-9a-fA-F]{6}$/)).optional(),
  sizeChart: sizeChartSchema,
  videos: z.array(z.string().url()).optional(),
  sizes: z.array(z.string()).min(1),
  colors: z.array(z.string()).optional(),
  variants: z
    .array(z.object({ size: z.string(), color: z.string().nullable(), stock: z.number().int().min(0) }))
    .min(1),
  isPromo: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const parsed = productSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { variants, sizeChart, ...rest } = parsed.data;
  const data = { ...rest, sizeChart: toSizeChartData(sizeChart) };
  const stock = variants.reduce((sum, v) => sum + v.stock, 0);

  const product = await prisma.product.create({
    data: { ...data, stock, variants: { create: variants } },
    include: { variants: true },
  });
  revalidateProductListings();
  revalidateProduct(product.slug);
  return NextResponse.json(product, { status: 201 });
}

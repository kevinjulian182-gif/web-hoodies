import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  const isStaff = requireRole(session, ['ADMIN', 'SUPER_ADMIN']);
  const products = await prisma.product.findMany({
    where: isStaff ? {} : { active: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(products);
}

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  brand: z.string().min(1),
  description: z.string().min(1),
  priceCents: z.number().int().positive(),
  images: z.array(z.string().url()).min(1),
  videos: z.array(z.string().url()).optional(),
  sizes: z.array(z.string()).min(1),
  colors: z.array(z.string()).optional(),
  stock: z.number().int().min(0),
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

  const product = await prisma.product.create({ data: parsed.data });
  return NextResponse.json(product, { status: 201 });
}

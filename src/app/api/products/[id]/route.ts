import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  priceCents: z.number().int().positive().optional(),
  images: z.array(z.string().url()).optional(),
  sizes: z.array(z.string()).optional(),
  stock: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
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
  const product = await prisma.product.update({ where: { id }, data: parsed.data });
  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  await prisma.product.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}

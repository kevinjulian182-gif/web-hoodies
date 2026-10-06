import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const [categories, counts] = await Promise.all([
    prismaInternal.category.findMany({ orderBy: { name: 'asc' } }),
    prismaInternal.product.groupBy({ by: ['category'], _count: { category: true }, where: { category: { not: null } } }),
  ]);
  const countByName = Object.fromEntries(counts.map((c) => [c.category, c._count.category]));
  return NextResponse.json(categories.map((c) => ({ ...c, productCount: countByName[c.name] ?? 0 })));
}

const createSchema = z.object({ name: z.string().trim().min(1) });

// Upsert rather than error-on-conflict: the product form calls this with
// whatever category is in the field on every save, new or already known,
// so "already exists" is the common case, not a failure.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const category = await prismaInternal.category.upsert({
    where: { name: parsed.data.name },
    update: {},
    create: { name: parsed.data.name },
  });
  return NextResponse.json(category, { status: 201 });
}

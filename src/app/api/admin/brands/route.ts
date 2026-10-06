import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const [brands, counts] = await Promise.all([
    prismaInternal.brand.findMany({ orderBy: { name: 'asc' } }),
    prismaInternal.product.groupBy({ by: ['brand'], _count: { brand: true } }),
  ]);
  const countByName = Object.fromEntries(counts.map((c) => [c.brand, c._count.brand]));
  return NextResponse.json(brands.map((b) => ({ ...b, productCount: countByName[b.name] ?? 0 })));
}

const createSchema = z.object({ name: z.string().trim().min(1) });

// Upsert rather than error-on-conflict: the product form calls this with
// whatever brand name is in the field on every save, new or already known,
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

  // Case-insensitive match first: Postgres' unique constraint is
  // case-sensitive, so without this an admin typing "Essentials" after
  // "ESSENTIALS" already exists would silently create a second,
  // differently-cased row instead of reusing it.
  const existing = await prismaInternal.brand.findFirst({
    where: { name: { equals: parsed.data.name, mode: 'insensitive' } },
  });
  const brand = existing ?? (await prismaInternal.brand.create({ data: { name: parsed.data.name } }));
  return NextResponse.json(brand, { status: 201 });
}

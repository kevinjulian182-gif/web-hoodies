import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

const schema = z.object({
  keepId: z.string().min(1),
  mergeIds: z.array(z.string().min(1)).min(1),
});

// Folds one or more near-duplicate Brand rows (e.g. "Fear of God" and "FEAR
// OF GOD", saved before the case-insensitive upsert existed) into a single
// survivor: every Product carrying one of the merged names is repointed to
// the survivor's name, then the merged Brand rows are deleted.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { keepId, mergeIds } = parsed.data;
  if (mergeIds.includes(keepId)) {
    return NextResponse.json({ error: 'La marca a conservar no puede estar en la lista a fusionar' }, { status: 400 });
  }

  const [survivor, merged] = await Promise.all([
    prismaInternal.brand.findUnique({ where: { id: keepId } }),
    prismaInternal.brand.findMany({ where: { id: { in: mergeIds } } }),
  ]);
  if (!survivor || merged.length !== mergeIds.length) {
    return NextResponse.json({ error: 'Marca no encontrada' }, { status: 404 });
  }

  await prismaInternal.$transaction([
    prismaInternal.product.updateMany({
      where: { brand: { in: merged.map((b) => b.name) } },
      data: { brand: survivor.name },
    }),
    prismaInternal.brand.deleteMany({ where: { id: { in: mergeIds } } }),
  ]);

  return NextResponse.json({ ok: true, survivor });
}

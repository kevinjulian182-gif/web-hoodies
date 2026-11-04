import { NextRequest, NextResponse } from 'next/server';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { entryFields, entrySchema } from '@/lib/ledger';

/** A money movement that isn't an order or a purchase (expenses, other income…). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = entrySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const entry = await prismaInternal.ledgerEntry.create({ data: entryFields(parsed.data) });
  return NextResponse.json(entry, { status: 201 });
}

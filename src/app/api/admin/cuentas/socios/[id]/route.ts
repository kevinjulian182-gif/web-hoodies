import { NextRequest, NextResponse } from 'next/server';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { partnerSchema } from '@/lib/partners';

/** Edits a saved person. A new name is carried to the records that used the
 * old one, so their totals stay together. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = partnerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const { id } = await params;
  const current = await prismaInternal.partner.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  const { name, phone, role } = parsed.data;
  if (name !== current.name) {
    const taken = await prismaInternal.partner.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } } });
    if (taken) return NextResponse.json({ error: `${name} ya está guardado.` }, { status: 409 });
  }
  await prismaInternal.$transaction([
    prismaInternal.partner.update({ where: { id }, data: { name, phone: phone || null, role: role || null } }),
    ...(name !== current.name
      ? [
          prismaInternal.purchase.updateMany({ where: { paidBy: current.name }, data: { paidBy: name } }),
          prismaInternal.ledgerEntry.updateMany({ where: { paidBy: current.name }, data: { paidBy: name } }),
          prismaInternal.creditPayment.updateMany({ where: { receivedBy: current.name }, data: { receivedBy: name } }),
        ]
      : []),
  ]);
  return NextResponse.json({ ok: true });
}

/** Removes someone from the list; past records keep their name. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const partner = await prismaInternal.partner.findUnique({ where: { id }, include: { user: true } });
  if (!partner) return NextResponse.json({ ok: true });
  // Leaving the list also closes their panel login (never the super admin's or your own).
  if (partner.user && partner.user.role === 'ADMIN' && partner.user.id !== session!.sub) {
    await prismaInternal.user.update({ where: { id: partner.user.id }, data: { role: 'CUSTOMER' } });
  }
  await prismaInternal.partner.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { PAYMENT_METHODS, TZ_OFFSET } from '@/lib/accountingConfig';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountCents: z.number().int().positive('Escribe el valor del abono.'),
  method: z.enum(PAYMENT_METHODS),
  receivedBy: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(300).optional(),
});

/** Edits an abono; the fiado's abonos can't add up to more than it's worth. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const { id } = await params;
  const payment = await prismaInternal.creditPayment.findUnique({ where: { id }, include: { order: { include: { creditPayments: true } } } });
  if (!payment) return NextResponse.json({ error: 'Abono no encontrado' }, { status: 404 });

  const others = payment.order.creditPayments.filter((p) => p.id !== id).reduce((n, p) => n + p.amountCents, 0);
  const max = payment.order.totalCents - others;
  if (parsed.data.amountCents > max) {
    return NextResponse.json({ error: `El abono no puede pasar de ${Math.round(max / 100).toLocaleString('es-CO')}.` }, { status: 400 });
  }
  const { date, receivedBy, notes, ...rest } = parsed.data;
  await prismaInternal.creditPayment.update({
    where: { id },
    data: { ...rest, receivedBy: receivedBy || null, notes: notes || null, date: new Date(`${date}T12:00:00${TZ_OFFSET}`) },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  await prismaInternal.creditPayment.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}

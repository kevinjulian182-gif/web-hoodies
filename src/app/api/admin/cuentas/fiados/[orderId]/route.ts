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

/** Records an abono toward a fiado. A fiado paid in full is marked as such. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });

  const { orderId } = await params;
  const order = await prismaInternal.order.findUnique({ where: { id: orderId }, include: { creditPayments: true } });
  if (!order || order.paymentMethod !== 'CREDIT') return NextResponse.json({ error: 'Fiado no encontrado' }, { status: 404 });
  const owed = order.totalCents - order.creditPayments.reduce((n, p) => n + p.amountCents, 0);
  if (parsed.data.amountCents > owed) {
    return NextResponse.json({ error: `El abono es mayor a lo que debe (${Math.round(owed / 100).toLocaleString('es-CO')}).` }, { status: 400 });
  }
  const { date, receivedBy, notes, ...rest } = parsed.data;
  const payment = await prismaInternal.creditPayment.create({
    data: { ...rest, orderId, receivedBy: receivedBy || null, notes: notes || null, date: new Date(`${date}T12:00:00${TZ_OFFSET}`) },
  });
  return NextResponse.json(payment, { status: 201 });
}

const editSchema = z.object({
  customerName: z.string().trim().min(2, 'Escribe el nombre.'),
  shippingPhone: z.string().trim().min(7, 'Escribe un celular válido.'),
  totalCents: z.number().int().positive('Escribe el valor del fiado.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Edits a fiado: who, their phone, the agreed value and the day it was given. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });

  const { orderId } = await params;
  const order = await prismaInternal.order.findUnique({ where: { id: orderId }, include: { creditPayments: true } });
  if (!order || order.paymentMethod !== 'CREDIT') return NextResponse.json({ error: 'Fiado no encontrado' }, { status: 404 });
  const paid = order.creditPayments.reduce((n, p) => n + p.amountCents, 0);
  const { customerName, shippingPhone, totalCents, date } = parsed.data;
  if (totalCents < paid) {
    return NextResponse.json({ error: `Ya abonó ${Math.round(paid / 100).toLocaleString('es-CO')}: el valor no puede ser menor.` }, { status: 400 });
  }
  // A lower value is a discount on the items; a higher one, an extra charge.
  await prismaInternal.order.update({
    where: { id: orderId },
    data: {
      customerName,
      shippingPhone,
      totalCents,
      discountCents: Math.max(0, order.subtotalCents - totalCents),
      createdAt: new Date(`${date}T12:00:00${TZ_OFFSET}`),
    },
  });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, TZ_OFFSET } from '@/lib/accountingConfig';

const schema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    type: z.enum(['INCOME', 'EXPENSE']),
    category: z.string(),
    description: z.string().trim().min(2, 'Escribe una descripción.'),
    amountCents: z.number().int().positive('Escribe el valor.'),
    method: z.enum(PAYMENT_METHODS),
    reference: z.string().trim().optional(),
  })
  .refine(
    (d) => (d.type === 'INCOME' ? (INCOME_CATEGORIES as readonly string[]) : (EXPENSE_CATEGORIES as readonly string[])).includes(d.category),
    { message: 'Elige una categoría.' }
  );

/** A money movement that isn't an order or a purchase (expenses, other income…). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const { date, reference, ...data } = parsed.data;
  const entry = await prismaInternal.ledgerEntry.create({
    data: { ...data, reference: reference || null, date: new Date(`${date}T12:00:00${TZ_OFFSET}`) },
  });
  return NextResponse.json(entry, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

const patchSchema = z.object({ active: z.boolean() });

/** Turns a coupon on or off without losing it. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const { id } = await params;
  const { count } = await prisma.coupon.updateMany({ where: { id }, data: { active: parsed.data.active } });
  if (count === 0) return NextResponse.json({ error: 'Cupón no encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Orders keep the code they used as text, so deleting a coupon never touches them.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  await prisma.coupon.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}

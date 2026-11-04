import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Escribe un correo válido.'),
  password: z.union([z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'), z.literal('')]).optional(),
});

/** Gives a partner their own login to the panel (an ADMIN account), or
 * updates it: new email, new password, or access back after being removed. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const { email } = parsed.data;
  const password = parsed.data.password || undefined;

  const { id } = await params;
  const partner = await prismaInternal.partner.findUnique({ where: { id }, include: { user: true } });
  if (!partner) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const owner = await prismaInternal.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, include: { partner: true } });
  if (owner && owner.partner && owner.partner.id !== id) {
    return NextResponse.json({ error: `Ese correo ya es la cuenta de ${owner.partner.name}.` }, { status: 409 });
  }

  // Already has an account: update it.
  if (partner.user) {
    const user = partner.user;
    if (owner && owner.id !== user.id) return NextResponse.json({ error: 'Ese correo ya lo usa otra cuenta.' }, { status: 409 });
    if (password && (user.role === 'SUPER_ADMIN' || user.id === session!.sub)) {
      return NextResponse.json({ error: 'Esa contraseña se cambia desde «Mi cuenta».' }, { status: 400 });
    }
    await prismaInternal.user.update({
      where: { id: user.id },
      data: {
        email,
        ...(user.role === 'CUSTOMER' ? { role: 'ADMIN' } : {}),
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
    });
    return NextResponse.json({ ok: true, created: false, passwordSet: Boolean(password) });
  }

  // An admin account that already exists (e.g. the owner's): just link it.
  if (owner && owner.role !== 'CUSTOMER') {
    await prismaInternal.partner.update({ where: { id }, data: { userId: owner.id } });
    return NextResponse.json({ ok: true, created: false, linked: true, passwordSet: false });
  }

  if (!password) return NextResponse.json({ error: 'Escribe una contraseña para su cuenta.' }, { status: 400 });
  const passwordHash = await bcrypt.hash(password, 10);
  // A customer account with that email becomes their panel account.
  const user = owner
    ? await prismaInternal.user.update({ where: { id: owner.id }, data: { role: 'ADMIN', passwordHash, name: owner.name ?? partner.name } })
    : await prismaInternal.user.create({ data: { email, passwordHash, name: partner.name, role: 'ADMIN' } });
  await prismaInternal.partner.update({ where: { id }, data: { userId: user.id } });
  return NextResponse.json({ ok: true, created: true, passwordSet: true });
}

/** Takes away a partner's panel login. Their records stay. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const partner = await prismaInternal.partner.findUnique({ where: { id }, include: { user: true } });
  if (!partner?.user) return NextResponse.json({ error: 'No tiene cuenta.' }, { status: 404 });
  if (partner.user.id === session!.sub) return NextResponse.json({ error: 'No puedes quitarte tu propio acceso.' }, { status: 400 });
  if (partner.user.role === 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'La cuenta del super admin no se puede desactivar desde aquí.' }, { status: 400 });
  }
  await prismaInternal.user.update({ where: { id: partner.user.id }, data: { role: 'CUSTOMER' } });
  return NextResponse.json({ ok: true });
}

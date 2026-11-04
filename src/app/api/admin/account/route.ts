import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSession, getSession, requireRole } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const user = await prisma.user.findUnique({ where: { id: session!.sub }, select: { email: true, role: true } });
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  return NextResponse.json(user);
}

const schema = z.object({
  currentPassword: z.string().min(1, 'Escribe tu contraseña actual'),
  email: z.string().trim().toLowerCase().email('Correo inválido').optional(),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres').optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  const { currentPassword, email, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session!.sub } });
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: 'La contraseña actual no es correcta' }, { status: 401 });
  }

  const emailChanged = email !== undefined && email !== user.email.toLowerCase();
  if (!emailChanged && !newPassword) {
    return NextResponse.json({ error: 'No hay cambios para guardar' }, { status: 400 });
  }
  if (emailChanged) {
    const taken = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, id: { not: user.id } },
    });
    if (taken) return NextResponse.json({ error: 'Ese correo ya está en uso por otra cuenta' }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(emailChanged ? { email } : {}),
      ...(newPassword ? { passwordHash: await bcrypt.hash(newPassword, 10) } : {}),
    },
  });

  // The session JWT carries the email, so re-issue it or the panel keeps
  // showing the old one until the next login.
  await createSession({ sub: updated.id, email: updated.email, role: updated.role, name: updated.name });
  return NextResponse.json({ email: updated.email });
}

import { NextRequest, NextResponse } from 'next/server';
import { prismaInternal } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { partnerSchema } from '@/lib/partners';

export async function GET() {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  return NextResponse.json(await prismaInternal.partner.findMany({ orderBy: { name: 'asc' } }));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = partnerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const { name, phone, role } = parsed.data;
  const exists = await prismaInternal.partner.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
  if (exists) return NextResponse.json({ error: `${name} ya está guardado.` }, { status: 409 });
  const partner = await prismaInternal.partner.create({ data: { name, phone: phone || null, role: role || null } });
  return NextResponse.json(partner, { status: 201 });
}

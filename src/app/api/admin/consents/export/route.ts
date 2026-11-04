import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { ensureConsentTable } from '@/lib/consent';

const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) return new Response('No autorizado', { status: 403 });
  await ensureConsentTable();
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const tipo = req.nextUrl.searchParams.get('tipo') ?? '';
  const records = await prisma.consentRecord.findMany({
    where: {
      ...(tipo ? { source: tipo } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
              { reference: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  const header = ['fecha_utc', 'origen', 'nombre', 'correo', 'celular', 'pedido', 'acepto_terminos', 'acepto_privacidad', 'cookies', 'version_textos', 'ip', 'navegador'];
  const rows = records.map((r) =>
    [r.createdAt.toISOString(), r.source, r.name, r.email, r.phone, r.reference, r.acceptedTerms, r.acceptedPrivacy, r.cookies, r.legalVersion, r.ip, r.userAgent]
      .map(cell)
      .join(',')
  );
  return new Response('﻿' + [header.join(','), ...rows].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="consentimientos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

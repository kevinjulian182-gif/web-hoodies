import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireRole } from '@/lib/auth';
import { computeAccounts } from '@/lib/accounting';
import { todayInColombia } from '@/lib/accountingConfig';

export const dynamic = 'force-dynamic';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const today = todayInColombia();
  const from = req.nextUrl.searchParams.get('from') ?? `${today.slice(0, 7)}-01`;
  const to = req.nextUrl.searchParams.get('to') ?? today;
  if (!YMD.test(from) || !YMD.test(to) || from > to) {
    return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 });
  }
  return NextResponse.json(await computeAccounts({ from, to }));
}

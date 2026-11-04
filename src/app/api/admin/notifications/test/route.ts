import { NextResponse } from 'next/server';
import { getSession, requireRole } from '@/lib/auth';
import { sendStoreAlert } from '@/lib/orderNotify';

export async function POST() {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const result = await sendStoreAlert('✅ Prueba de AFRA: los avisos de pedidos nuevos llegarán aquí.');
  const failed = result.results.filter((r) => !r.ok);
  return NextResponse.json(
    {
      ok: result.ok,
      sent: result.results.filter((r) => r.ok).map((r) => r.channel),
      error: failed.map((r) => `${r.channel}: ${r.error}`).join(' · ') || undefined,
    },
    { status: result.ok ? 200 : 502 }
  );
}

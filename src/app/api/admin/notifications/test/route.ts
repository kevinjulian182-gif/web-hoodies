import { NextResponse } from 'next/server';
import { getSession, requireRole } from '@/lib/auth';
import { sendStoreWhatsApp } from '@/lib/orderNotify';

export async function POST() {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const result = await sendStoreWhatsApp(
    '✅ Prueba de AFRA: los avisos de pedidos nuevos llegarán a este WhatsApp.'
  );
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

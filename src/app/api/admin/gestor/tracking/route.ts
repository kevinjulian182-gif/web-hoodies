import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { refreshOrderTracking, refreshShippedOrders } from '@/lib/tracking';

/** "Actualizar seguimiento": one order ({ id }) or every shipped order. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  try {
    if (body.id) {
      const order = await prisma.order.findUnique({ where: { id: body.id }, select: { id: true, trackingNumber: true, status: true } });
      if (!order?.trackingNumber) return NextResponse.json({ error: 'El pedido no tiene guía.' }, { status: 400 });
      const result = await refreshOrderTracking(order);
      return NextResponse.json({ checked: 1, delivered: result?.delivered ? 1 : 0, errors: [] });
    }
    return NextResponse.json(await refreshShippedOrders(0));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo consultar el seguimiento.' }, { status: 502 });
  }
}

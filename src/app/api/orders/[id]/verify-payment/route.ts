import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { findWompiTransactionByReference } from '@/lib/wompi';
import { applyWompiTransaction } from '@/lib/wompiPayments';

const STATUS_TEXT: Record<string, string> = {
  APPROVED: 'aprobado',
  PENDING: 'pendiente en Wompi',
  DECLINED: 'rechazado',
  VOIDED: 'anulado',
  ERROR: 'con error',
};

/** Asks Wompi for this order's payment and updates the order to match. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, select: { wompiReference: true, paymentMethod: true } });
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  if (order.paymentMethod !== 'WOMPI') return NextResponse.json({ error: 'Este pedido no se pagó con Wompi.' }, { status: 400 });

  try {
    const transaction = await findWompiTransactionByReference(order.wompiReference);
    if (!transaction) {
      return NextResponse.json({ ok: true, text: 'Wompi no tiene ningún pago con esta referencia: el cliente no llegó a pagar.' });
    }
    const result = await applyWompiTransaction(transaction);
    const word = STATUS_TEXT[transaction.status] ?? transaction.status;
    return NextResponse.json({
      ok: true,
      text: result.changed
        ? `Pago ${word} en Wompi. Pedido actualizado.`
        : `Pago ${word} en Wompi. El pedido ya estaba al día.`,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo consultar Wompi.' }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWompiWebhook } from '@/lib/wompi';
import { sendOrderConfirmationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const event = await req.json();

  const isValid = await verifyWompiWebhook(event);
  if (!isValid) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  const { transaction } = event.data;
  const order = await prisma.order.findUnique({
    where: { wompiReference: transaction.reference },
    include: { items: { include: { product: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  if (transaction.status === 'APPROVED' && order.status === 'PENDING') {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID', wompiTransactionId: transaction.id },
      }),
      ...order.items.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      ),
    ]);
    await sendOrderConfirmationEmail({ ...order, status: 'PAID' });
  } else if (transaction.status === 'DECLINED' || transaction.status === 'ERROR') {
    await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
  }

  return NextResponse.json({ ok: true });
}

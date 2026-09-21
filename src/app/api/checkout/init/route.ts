import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { buildWompiSignature, generateOrderReference, getWompiPublicKey } from '@/lib/wompi';
import { sendOrderConfirmationEmail } from '@/lib/email';

const schema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  customerDocument: z.string().min(1),
  shippingAddress: z.string().min(1),
  shippingAddressComplement: z.string().optional(),
  shippingDepartment: z.string().min(1),
  shippingCity: z.string().min(1),
  shippingPhone: z.string().min(7),
  deliveryNotes: z.string().optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(['WOMPI', 'COD']).default('WOMPI'),
  items: z
    .array(
      z.object({
        productId: z.string(),
        size: z.string(),
        color: z.string().optional(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { items, couponCode, paymentMethod, ...customer } = parsed.data;

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, active: true },
  });
  if (products.length !== new Set(items.map((i) => i.productId)).size) {
    return NextResponse.json({ error: 'Uno o más productos ya no están disponibles' }, { status: 400 });
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of items) {
    const product = productMap.get(item.productId)!;
    if (product.stock < item.quantity) {
      return NextResponse.json({ error: `Stock insuficiente para ${product.name}` }, { status: 400 });
    }
  }

  const subtotalCents = items.reduce((sum, i) => sum + productMap.get(i.productId)!.priceCents * i.quantity, 0);

  let discountCents = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
    if (coupon && coupon.active && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
      discountCents =
        coupon.discountType === 'PERCENT'
          ? Math.round((subtotalCents * coupon.value) / 100)
          : Math.min(coupon.value, subtotalCents);
    }
  }

  const totalCents = subtotalCents - discountCents;
  const reference = generateOrderReference();

  const order = await prisma.order.create({
    data: {
      ...customer,
      paymentMethod,
      subtotalCents,
      discountCents,
      totalCents,
      couponCode: discountCents > 0 ? couponCode : null,
      wompiReference: reference,
      items: {
        create: items.map((i) => ({
          productId: i.productId,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          priceCents: productMap.get(i.productId)!.priceCents,
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });

  // Pago contra entrega: no hay pasarela que confirme el pago, así que el
  // pedido queda comprometido de una vez (se descuenta stock y se avisa al
  // cliente) apenas se crea, en vez de esperar un webhook que nunca llega.
  if (paymentMethod === 'COD') {
    await prisma.$transaction(
      order.items.map((item) =>
        prisma.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } })
      )
    );
    await sendOrderConfirmationEmail(order);
    return NextResponse.json({
      orderId: order.id,
      reference,
      amountInCents: totalCents,
      currency: 'COP',
      paymentMethod,
    });
  }

  const [signature, publicKey] = await Promise.all([
    buildWompiSignature(reference, totalCents, 'COP'),
    getWompiPublicKey(),
  ]);

  return NextResponse.json({
    orderId: order.id,
    reference,
    amountInCents: totalCents,
    currency: 'COP',
    signature,
    publicKey,
    paymentMethod,
  });
}

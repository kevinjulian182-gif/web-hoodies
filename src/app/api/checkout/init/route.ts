import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { buildWompiSignature, generateOrderReference, getWompiPublicKey } from '@/lib/wompi';
import { notifyOrderConfirmed } from '@/lib/orderNotify';
import { checkStock, buildStockDecrementOps } from '@/lib/stock';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';
import { getSiteContent, getFreeShippingThresholdCents, getShippingRates } from '@/lib/content';
import { computeDiscountCents, computeShippingCents } from '@/lib/pricing';

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
    include: { variants: true },
  });
  if (products.length !== new Set(items.map((i) => i.productId)).size) {
    return NextResponse.json({ error: 'Uno o más productos ya no están disponibles' }, { status: 400 });
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const stockError = checkStock(productMap, items);
  if (stockError) {
    return NextResponse.json({ error: stockError }, { status: 400 });
  }

  const subtotalCents = items.reduce((sum, i) => sum + productMap.get(i.productId)!.priceCents * i.quantity, 0);

  const code = couponCode?.trim().toUpperCase();
  let discountCents = 0;
  if (code) {
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (coupon && coupon.active && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
      discountCents = computeDiscountCents(coupon, subtotalCents);
    }
  }

  const content = await getSiteContent();
  const shippingCents = computeShippingCents(
    subtotalCents,
    getFreeShippingThresholdCents(content),
    getShippingRates(content),
    customer.shippingDepartment
  );
  const totalCents = subtotalCents - discountCents + shippingCents;
  const reference = generateOrderReference();

  const order = await prisma.order.create({
    data: {
      ...customer,
      paymentMethod,
      subtotalCents,
      discountCents,
      totalCents,
      couponCode: discountCents > 0 ? code : null,
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
    await prisma.$transaction(buildStockDecrementOps(productMap, items));
    revalidateProductListings();
    for (const product of productMap.values()) revalidateProduct(product.slug);
    // Email + WhatsApp to the customer and the store's heads-up run after the
    // response, so the shopper isn't kept waiting; none can fail the order.
    after(() => notifyOrderConfirmed(order));
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

import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { buildWompiSignature, generateOrderReference, getWompiPublicKey } from '@/lib/wompi';
import { notifyOrderConfirmed } from '@/lib/orderNotify';
import { recordConsent } from '@/lib/consent';
import {
  checkStock,
  buildStockDecrementOps,
  orderHoldsStock,
  releaseOrderStock,
  releaseStaleReservations,
} from '@/lib/stock';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';
import { computeDiscountCents } from '@/lib/pricing';

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
  // Wompi order this shopper started and then left (changed method/coupon):
  // its reserved units are released before this one is checked.
  previousReference: z.string().optional(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar los términos y condiciones.' }) }),
  acceptPrivacy: z.literal(true, {
    errorMap: () => ({ message: 'Debes autorizar el tratamiento de tus datos personales.' }),
  }),
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
  const { items, couponCode, paymentMethod, previousReference, acceptTerms, acceptPrivacy, ...customer } = parsed.data;

  const released = await releaseStaleReservations();
  if (previousReference) {
    const previous = await prisma.order.findUnique({ where: { wompiReference: previousReference } });
    if (
      previous &&
      previous.paymentMethod === 'WOMPI' &&
      previous.status === 'PENDING' &&
      previous.customerEmail === customer.customerEmail &&
      orderHoldsStock(previous)
    ) {
      const { count } = await prisma.order.updateMany({
        where: { id: previous.id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      if (count === 1) released.push(...(await releaseOrderStock(previous.id)));
    }
  }
  if (released.length) {
    revalidateProductListings();
    for (const slug of new Set(released)) revalidateProduct(slug);
  }

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

  // Shipping isn't part of the total: it's free over the threshold or paid
  // to the carrier on delivery (see SHIPPING_EXTRA in lib/pricing).
  const totalCents = subtotalCents - discountCents;
  const reference = generateOrderReference();

  // Sign before creating anything: a Wompi misconfiguration must not leave
  // an order behind holding stock the shopper can't pay for.
  let wompi: { signature: string; publicKey: string } | null = null;
  if (paymentMethod === 'WOMPI') {
    try {
      const [signature, publicKey] = await Promise.all([
        buildWompiSignature(reference, totalCents, 'COP'),
        getWompiPublicKey(),
      ]);
      wompi = { signature, publicKey };
    } catch (err) {
      console.error('Wompi no está configurado:', err);
      return NextResponse.json(
        { error: 'El pago en línea no está disponible en este momento. Puedes elegir pago contra entrega.' },
        { status: 503 }
      );
    }
  }

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

  // Every order takes its units the moment it's placed, so two shoppers
  // can't buy the last one. A Wompi order that's declined or never paid
  // gives them back (webhook / releaseStaleReservations).
  await recordConsent(req, {
    source: 'checkout',
    email: customer.customerEmail,
    name: customer.customerName,
    phone: customer.shippingPhone,
    reference,
    acceptedTerms: acceptTerms,
    acceptedPrivacy: acceptPrivacy,
  });
  await prisma.$transaction(buildStockDecrementOps(productMap, items));
  revalidateProductListings();
  for (const product of productMap.values()) revalidateProduct(product.slug);

  // Pago contra entrega: no hay pasarela que confirme el pago, así que el
  // pedido queda confirmado (y se avisa al cliente) apenas se crea.
  if (paymentMethod === 'COD') {
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


  return NextResponse.json({
    orderId: order.id,
    reference,
    amountInCents: totalCents,
    currency: 'COP',
    signature: wompi!.signature,
    publicKey: wompi!.publicKey,
    paymentMethod,
  });
}

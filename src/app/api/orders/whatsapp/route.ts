import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { notifyStoreNewOrder } from '@/lib/orderNotify';
import { checkStock, buildStockDecrementOps, type ProductWithVariants } from '@/lib/stock';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';
import { WHATSAPP_ORDER_PREFIX, PLACEHOLDER_ADDRESS } from '@/lib/orderSource';
import { getSiteContent, getFreeShippingThresholdCents, getShippingRates } from '@/lib/content';
import { minShippingCents, qualifiesForFreeShipping } from '@/lib/pricing';

const schema = z.object({
  customerName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .refine((v) => {
      const digits = v.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15;
    }, 'Teléfono inválido'),
  city: z.string().trim().max(80).optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        size: z.string().min(1),
        color: z.string().optional(),
        quantity: z.number().int().positive().max(20),
      })
    )
    .min(1)
    .max(30),
});

// Registers an order placed through "Pedir por WhatsApp" before the shopper
// is handed off to the chat, and pings the store. Like every order it takes
// its units right away; deleting it in the admin gives them back.
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa tu nombre y celular.' }, { status: 400 });
  }
  const { customerName, phone, city, items } = parsed.data;

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, active: true },
    include: { variants: true },
  });
  const priceById = new Map(products.map((p) => [p.id, p.priceCents]));
  const valid = items.filter((i) => priceById.has(i.productId));
  if (valid.length === 0) {
    return NextResponse.json({ error: 'Los productos ya no están disponibles.' }, { status: 400 });
  }
  const productMap = new Map<string, ProductWithVariants>(products.map((p) => [p.id, p]));
  const stockError = checkStock(productMap, valid);
  if (stockError) {
    return NextResponse.json({ error: `${stockError}. Ajusta tu carrito e intenta de nuevo.` }, { status: 409 });
  }

  const subtotalCents = valid.reduce((sum, i) => sum + priceById.get(i.productId)! * i.quantity, 0);
  const content = await getSiteContent();
  // The chat only knows the city, not the department, so the exact rate is
  // agreed there; the order total holds the products alone unless shipping
  // is already free.
  const freeShipping = qualifiesForFreeShipping(subtotalCents, getFreeShippingThresholdCents(content));
  const shippingFromCents = minShippingCents(getShippingRates(content));
  const reference = `${WHATSAPP_ORDER_PREFIX}${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

  const order = await prisma.order.create({
    data: {
      customerName,
      customerEmail: '',
      shippingPhone: phone,
      shippingAddress: PLACEHOLDER_ADDRESS,
      shippingCity: city || 'Por confirmar',
      paymentMethod: 'COD',
      subtotalCents,
      discountCents: 0,
      totalCents: subtotalCents,
      wompiReference: reference,
      items: {
        create: valid.map((i) => ({
          productId: i.productId,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          priceCents: priceById.get(i.productId)!,
        })),
      },
    },
    include: { items: { include: { product: { select: { name: true } } } } },
  });

  await prisma.$transaction(buildStockDecrementOps(productMap, valid));
  revalidateProductListings();
  for (const product of productMap.values()) revalidateProduct(product.slug);

  await notifyStoreNewOrder(order);
  return NextResponse.json({ reference, orderId: order.id, freeShipping, shippingFromCents });
}

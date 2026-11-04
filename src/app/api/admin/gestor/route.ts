import { NextRequest, NextResponse, after } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { buildStockDecrementOps, checkStock, type ProductWithVariants } from '@/lib/stock';
import { MANUAL_ORDER_PREFIX } from '@/lib/orderSource';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';
import { getTrackingApiKey, refreshShippedOrders } from '@/lib/tracking';
import { getFreeShippingThresholdCents, getSiteContent } from '@/lib/content';

const ORDER_INCLUDE = {
  items: { include: { product: { select: { name: true, slug: true, images: true, colorImages: true } } } },
  creditPayments: { select: { amountCents: true } },
} as const;

export async function GET() {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const [orders, trackingKey, content] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, include: ORDER_INCLUDE, take: 500 }),
    getTrackingApiKey(),
    getSiteContent(),
  ]);
  // Opening the manager also refreshes guías not checked in the last 3 hours,
  // in the background, so the next load shows newer carrier states.
  if (trackingKey) after(() => refreshShippedOrders(180).catch(() => {}));
  return NextResponse.json({
    orders,
    trackingEnabled: Boolean(trackingKey),
    freeShippingThresholdCents: getFreeShippingThresholdCents(content),
  });
}

const schema = z.object({
  customerName: z.string().trim().min(2, 'Escribe el nombre del cliente.'),
  shippingPhone: z.string().trim().min(7, 'Escribe un celular válido.'),
  customerDocument: z.string().trim().optional(),
  customerEmail: z.union([z.string().trim().email('El correo no es válido.'), z.literal('')]).default(''),
  shippingAddress: z.string().trim().min(4, 'Escribe la dirección.'),
  shippingAddressComplement: z.string().trim().optional(),
  shippingCity: z.string().trim().min(2, 'Escribe la ciudad.'),
  shippingDepartment: z.string().trim().optional(),
  deliveryNotes: z.string().trim().optional(),
  paymentMethod: z.enum(['COD', 'TRANSFER', 'CREDIT']),
  shippingCents: z.number().int().min(0).default(0),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        size: z.string().min(1, 'Elige la talla.'),
        color: z.string().optional(),
        quantity: z.number().int().min(1),
        priceCents: z.number().int().min(0),
      })
    )
    .min(1, 'Agrega al menos un producto.'),
});

/** Registers an order taken outside the web (Instagram, WhatsApp, in
 * person) and takes its units from the store's inventory. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  const data = parsed.data;
  const items = data.items.map((i) => ({ ...i, color: i.color || undefined }));

  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set(items.map((i) => i.productId))] } },
    include: { variants: true },
  });
  const productMap = new Map<string, ProductWithVariants>(products.map((p) => [p.id, p]));
  if (items.some((i) => !productMap.has(i.productId))) {
    return NextResponse.json({ error: 'Uno de los productos ya no existe.' }, { status: 400 });
  }
  const stockError = checkStock(productMap, items);
  if (stockError) return NextResponse.json({ error: `${stockError}.` }, { status: 409 });

  const subtotalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
  const reference = `${MANUAL_ORDER_PREFIX}${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

  const [order] = await prisma.$transaction([
    prisma.order.create({
      data: {
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerDocument: data.customerDocument || null,
        shippingPhone: data.shippingPhone,
        shippingAddress: data.shippingAddress,
        shippingAddressComplement: data.shippingAddressComplement || null,
        shippingCity: data.shippingCity,
        shippingDepartment: data.shippingDepartment || null,
        deliveryNotes: data.deliveryNotes || null,
        paymentMethod: data.paymentMethod,
        // Paid by transfer: ready to ship. Cash on delivery: pending.
        status: data.paymentMethod === 'TRANSFER' ? 'PAID' : 'PENDING',
        subtotalCents,
        discountCents: 0,
        totalCents: subtotalCents + data.shippingCents,
        wompiReference: reference,
        items: { create: items.map(({ productId, size, color, quantity, priceCents }) => ({ productId, size, color, quantity, priceCents })) },
      },
      include: ORDER_INCLUDE,
    }),
    ...buildStockDecrementOps(productMap, items),
  ]);

  revalidateProductListings();
  for (const product of products) revalidateProduct(product.slug);
  return NextResponse.json(order, { status: 201 });
}

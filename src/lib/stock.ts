import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { variantKey } from '@/lib/variants';
import { isWhatsAppOrder } from '@/lib/orderSource';
import type { Product, ProductVariant } from '@prisma/client';

// costCents is omitted from the public `prisma` client's Product type (see
// lib/prisma.ts) — both checkout routes read products through it, so this
// type has to match what they actually get instead of the raw model type.
export type ProductWithVariants = Omit<Product, 'costCents'> & { variants: ProductVariant[] };
export type StockCheckItem = { productId: string; size: string; color?: string; quantity: number };

// A product with no ProductVariant rows predates per-variant stock — treat
// its old aggregate `stock` as the source of truth rather than blocking
// every sale until someone re-saves it through the admin's stock matrix.
export function checkStock(productMap: Map<string, ProductWithVariants>, items: StockCheckItem[]): string | null {
  for (const item of items) {
    const product = productMap.get(item.productId)!;
    if (product.variants.length > 0) {
      const variant = product.variants.find(
        (v) => variantKey(v.size, v.color) === variantKey(item.size, item.color ?? null)
      );
      if (!variant || variant.stock < item.quantity) {
        return `Stock insuficiente para ${product.name}${item.color ? ` (${item.color})` : ''} talla ${item.size}`;
      }
    } else if (product.stock < item.quantity) {
      return `Stock insuficiente para ${product.name}`;
    }
  }
  return null;
}

// Keeps Product.stock (the cached total other screens already read) and the
// specific variant's stock decremented together — call only after
// checkStock has confirmed every item, so the variant lookup here is
// guaranteed to match.
export function buildStockDecrementOps(
  productMap: Map<string, ProductWithVariants>,
  items: StockCheckItem[]
): Prisma.PrismaPromise<unknown>[] {
  return items.flatMap((item) => {
    const product = productMap.get(item.productId)!;
    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } }),
    ];
    if (product.variants.length > 0) {
      // Prisma's compound-unique `update` requires every field non-null, so
      // it can't target a row whose color is null (no-color products) —
      // updateMany's plain where filter has no such restriction, and the
      // @@unique constraint still guarantees this matches at most one row.
      ops.push(
        prisma.productVariant.updateMany({
          where: { productId: item.productId, size: item.size, color: item.color ?? null },
          data: { stock: { decrement: item.quantity } },
        })
      );
    }
    return ops;
  });
}

/** Mirror of buildStockDecrementOps: puts an order's units back. */
export function buildStockRestoreOps(
  productMap: Map<string, ProductWithVariants>,
  items: StockCheckItem[]
): Prisma.PrismaPromise<unknown>[] {
  return items.flatMap((item) => {
    const product = productMap.get(item.productId);
    if (!product) return [];
    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } }),
    ];
    if (product.variants.length > 0) {
      ops.push(
        prisma.productVariant.updateMany({
          where: { productId: item.productId, size: item.size, color: item.color ?? null },
          data: { stock: { increment: item.quantity } },
        })
      );
    }
    return ops;
  });
}

// ── Stock held by orders ─────────────────────────────────────────────────
// Every order takes its units the moment it's placed (COD, Wompi and
// WhatsApp alike). Orders from before that rule only took stock when paid
// (Wompi) or shipped (WhatsApp); this date tells the two apart, since the
// Order table has no column for it.
export const STOCK_AT_ORDER_SINCE = new Date('2026-10-19T08:17:00Z');

/** Minutes a Wompi order keeps its units while waiting for the payment.
 * A shopper who closes Wompi without paying never triggers a webhook, so
 * the reservation is released after this. */
const WOMPI_HOLD_MINUTES = 180;

type OrderForStock = {
  id: string;
  wompiReference: string;
  paymentMethod: 'WOMPI' | 'COD';
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'CANCELLED';
  createdAt: Date;
};

/** Whether this order's units are currently out of stock. */
export function orderHoldsStock(order: OrderForStock): boolean {
  if (order.status === 'CANCELLED') return false;
  if (order.status === 'SHIPPED' || order.status === 'PAID') return true;
  // PENDING: contra entrega always took stock at checkout; Wompi and
  // WhatsApp orders only since STOCK_AT_ORDER_SINCE.
  if (order.paymentMethod === 'COD' && !isWhatsAppOrder(order.wompiReference)) return true;
  return order.createdAt >= STOCK_AT_ORDER_SINCE;
}

async function loadOrderLines(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { include: { variants: true } } } } },
  });
  if (!order) return null;
  const productMap = new Map<string, ProductWithVariants>(order.items.map((i) => [i.productId, i.product]));
  const lines: StockCheckItem[] = order.items.map((i) => ({
    productId: i.productId,
    size: i.size,
    color: i.color ?? undefined,
    quantity: i.quantity,
  }));
  return { order, productMap, lines };
}

/** Takes the order's units now (used when an order that wasn't holding
 * stock becomes real, e.g. a late Wompi approval after release). */
export async function takeOrderStock(orderId: string): Promise<string[]> {
  const data = await loadOrderLines(orderId);
  if (!data) return [];
  await prisma.$transaction(buildStockDecrementOps(data.productMap, data.lines));
  return [...data.productMap.values()].map((p) => p.slug);
}

/** Returns the order's units to stock. Returns the affected product slugs. */
export async function releaseOrderStock(orderId: string): Promise<string[]> {
  const data = await loadOrderLines(orderId);
  if (!data) return [];
  await prisma.$transaction(buildStockRestoreOps(data.productMap, data.lines));
  return [...data.productMap.values()].map((p) => p.slug);
}

let lastSweep = 0;

/** Cancels Wompi orders left unpaid past the hold window and gives their
 * units back. Runs lazily (at most once a minute per server instance)
 * from the endpoints that read stock, so no cron is needed. */
export async function releaseStaleReservations(): Promise<string[]> {
  if (Date.now() - lastSweep < 60_000) return [];
  lastSweep = Date.now();
  const stale = await prisma.order.findMany({
    where: {
      paymentMethod: 'WOMPI',
      status: 'PENDING',
      createdAt: { gte: STOCK_AT_ORDER_SINCE, lt: new Date(Date.now() - WOMPI_HOLD_MINUTES * 60_000) },
    },
    select: { id: true },
  });
  const slugs: string[] = [];
  for (const { id } of stale) {
    // Flip the status first so a concurrent sweep can't release twice.
    const { count } = await prisma.order.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'CANCELLED' } });
    if (count === 1) slugs.push(...(await releaseOrderStock(id)));
  }
  return slugs;
}

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { variantKey } from '@/lib/variants';
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

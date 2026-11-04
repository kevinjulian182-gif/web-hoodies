import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prismaInternal } from '@/lib/prisma';
import { variantKey } from '@/lib/variants';
import { PAYMENT_METHODS, TZ_OFFSET } from '@/lib/accountingConfig';

// Shared by creating and editing a merchandise purchase: validation, and
// the inventory writes that keep stock in step with what was bought.

export const purchaseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supplier: z.string().trim().min(2, 'Escribe el proveedor.'),
  invoiceNumber: z.string().trim().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paidBy: z.string().trim().max(60).optional(),
  orderId: z.string().optional(),
  notes: z.string().trim().optional(),
  addToStock: z.boolean().default(true),
  updateCost: z.boolean().default(true),
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        description: z.string().trim().min(1, 'Describe cada artículo.'),
        size: z.string().optional(),
        color: z.string().optional(),
        quantity: z.number().int().min(1),
        unitCostCents: z.number().int().min(0),
      })
    )
    .min(1, 'Agrega al menos un artículo.'),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type PurchaseLine = { productId: string | null; description: string; size: string | null; color: string | null; quantity: number; unitCostCents: number };
type ProductWithVariants = Awaited<ReturnType<typeof loadProducts>>[number];

const loadProducts = (ids: string[]) => prismaInternal.product.findMany({ where: { id: { in: ids } }, include: { variants: true } });

export function normalizeLines(items: PurchaseInput['items']): PurchaseLine[] {
  return items.map((i) => ({ ...i, productId: i.productId || null, size: i.size || null, color: i.color || null }));
}

/** Loads the products the lines (old and new) touch and checks the new lines. */
export async function loadPurchaseProducts(lines: PurchaseLine[], addToStock: boolean, extraIds: string[] = []) {
  const ids = [...new Set([...lines.flatMap((l) => (l.productId ? [l.productId] : [])), ...extraIds])];
  const byId = new Map((await loadProducts(ids)).map((p) => [p.id, p]));
  for (const l of lines) {
    if (!l.productId) continue;
    const p = byId.get(l.productId);
    if (!p) return { byId, error: 'Uno de los productos ya no existe.' };
    if (addToStock && p.sizes.length && !p.sizes.includes(l.size ?? '')) return { byId, error: `Elige la talla de ${p.name}.` };
    if (addToStock && p.colors.length && !p.colors.includes(l.color ?? '')) return { byId, error: `Elige el color de ${p.name}.` };
  }
  return { byId, error: null };
}

/** Adds (sign 1) or takes back (sign -1) the units of the store products in
 * `lines`. Lines for the same size and color are combined, so a missing
 * variant is created once. */
export function stockOps(lines: PurchaseLine[], byId: Map<string, ProductWithVariants>, sign: 1 | -1) {
  const grouped = new Map<string, PurchaseLine>();
  for (const l of lines) {
    if (!l.productId || !byId.has(l.productId)) continue;
    const key = `${l.productId}|${variantKey(l.size ?? '', l.color)}`;
    const prev = grouped.get(key);
    grouped.set(key, prev ? { ...prev, quantity: prev.quantity + l.quantity } : l);
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const l of grouped.values()) {
    const p = byId.get(l.productId!)!;
    const change = sign === 1 ? { increment: l.quantity } : { decrement: l.quantity };
    ops.push(prismaInternal.product.update({ where: { id: p.id }, data: { stock: change } }));
    if (!p.variants.length) continue;
    const exists = p.variants.some((v) => variantKey(v.size, v.color) === variantKey(l.size ?? '', l.color));
    if (exists) {
      ops.push(prismaInternal.productVariant.updateMany({ where: { productId: p.id, size: l.size ?? '', color: l.color }, data: { stock: change } }));
    } else if (sign === 1) {
      ops.push(prismaInternal.productVariant.create({ data: { productId: p.id, size: l.size ?? '', color: l.color, stock: l.quantity } }));
    }
  }
  return ops;
}

/** Saves each store product's unit cost from the purchase. */
export function costOps(lines: PurchaseLine[], byId: Map<string, ProductWithVariants>) {
  return lines
    .filter((l) => l.productId && byId.has(l.productId) && l.unitCostCents > 0)
    .map((l) => prismaInternal.product.update({ where: { id: l.productId! }, data: { costCents: l.unitCostCents } }));
}

export function purchaseFields(data: PurchaseInput, lines: PurchaseLine[]) {
  return {
    date: new Date(`${data.date}T12:00:00${TZ_OFFSET}`),
    supplier: data.supplier,
    invoiceNumber: data.invoiceNumber || null,
    paymentMethod: data.paymentMethod,
    paidBy: data.paidBy || null,
    orderId: data.orderId || null,
    notes: data.notes || null,
    totalCents: lines.reduce((sum, l) => sum + l.unitCostCents * l.quantity, 0),
    addedToStock: data.addToStock && lines.some((l) => l.productId),
  };
}

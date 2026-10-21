import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { variantKey } from '@/lib/variants';
import { releaseStaleReservations } from '@/lib/stock';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';

const schema = z.object({
  lines: z
    .array(z.object({ productId: z.string(), size: z.string(), color: z.string().optional() }))
    .min(1)
    .max(50),
});

// Live stock for each cart line (size + color), so the cart never holds
// more units than exist. Same rules as checkout's checkStock: a product
// without variant rows uses its overall stock; inactive products have 0.
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  const { lines } = parsed.data;
  const released = await releaseStaleReservations();
  if (released.length) {
    revalidateProductListings();
    for (const slug of new Set(released)) revalidateProduct(slug);
  }

  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set(lines.map((l) => l.productId))] }, active: true },
    select: { id: true, stock: true, variants: { select: { size: true, color: true, stock: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const stocks = lines.map((line) => {
    const product = byId.get(line.productId);
    if (!product) return 0;
    if (product.variants.length === 0) return Math.max(0, product.stock);
    const variant = product.variants.find(
      (v) => variantKey(v.size, v.color) === variantKey(line.size, line.color ?? null)
    );
    return Math.max(0, variant?.stock ?? 0);
  });
  return NextResponse.json({ stocks }, { headers: { 'Cache-Control': 'no-store' } });
}

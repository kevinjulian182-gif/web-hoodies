import type { Metadata } from 'next';
import ProductGrid from '@/components/ProductGrid';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Promos — AFRA',
  description: 'Piezas originales de streetwear con descuento por tiempo limitado, pago contra entrega en toda Colombia.',
};

export default async function PromosPage() {
  const allActive = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });
  const products = allActive.filter(
    (p) => typeof p.compareAtPriceCents === 'number' && p.compareAtPriceCents > p.priceCents
  );

  return (
    <div className="pt-8">
      <h1 className="mx-auto max-w-7xl px-6 text-3xl font-semibold tracking-tightest text-coffee-900">Promos</h1>
      <p className="mx-auto max-w-7xl px-6 mt-2 text-coffee-600">Piezas con descuento, por tiempo limitado.</p>

      {products.length === 0 ? (
        <p className="mx-auto max-w-7xl px-6 py-24 text-center text-coffee-600">
          No hay promociones activas en este momento.
        </p>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}

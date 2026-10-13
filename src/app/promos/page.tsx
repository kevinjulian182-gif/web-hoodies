import type { Metadata } from 'next';
import ProductGrid from '@/components/ProductGrid';
import { prisma } from '@/lib/prisma';

// Cached and served statically between revalidations — see src/app/page.tsx.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Promos — AFRA',
  description: 'Piezas premium de streetwear con descuento por tiempo limitado, pago contra entrega y garantía en toda Colombia.',
};

export default async function PromosPage() {
  const [products, brandLogos] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, isPromo: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.brand.findMany({ select: { name: true, logoUrl: true }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="pt-8">
      <h1 className="mx-auto max-w-7xl px-6 text-3xl font-semibold tracking-tightest text-coffee-900">Promos</h1>
      <p className="mx-auto max-w-7xl px-6 mt-2 text-coffee-600">Piezas con descuento, por tiempo limitado.</p>

      {products.length === 0 ? (
        <p className="mx-auto max-w-7xl px-6 py-24 text-center text-coffee-600">
          No hay promociones activas en este momento.
        </p>
      ) : (
        <ProductGrid products={products} brandLogos={brandLogos} />
      )}
    </div>
  );
}

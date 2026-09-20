import ProductGrid from '@/components/ProductGrid';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function CatalogPage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="pt-8">
      <h1 className="mx-auto max-w-7xl px-6 text-3xl font-semibold tracking-tightest text-coffee-900">
        Catálogo
      </h1>
      <ProductGrid products={products} />
    </div>
  );
}

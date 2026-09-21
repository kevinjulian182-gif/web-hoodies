import ProductGrid from '@/components/ProductGrid';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ marca?: string }>;
}) {
  const { marca } = await searchParams;
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="pt-8">
      <h1 className="font-display mx-auto max-w-7xl px-6 text-4xl italic font-semibold text-coffee-900">
        Catálogo
      </h1>
      <ProductGrid products={products} initialBrand={marca} />
    </div>
  );
}

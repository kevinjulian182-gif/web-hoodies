import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatCOP } from '@/lib/format';
import AddToCartButton from '@/components/AddToCartButton';
import ProductGallery from '@/components/ProductGallery';
import ProductGrid from '@/components/ProductGrid';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product || !product.active) notFound();

  const related = await prisma.product.findMany({
    where: { brand: product.brand, active: true, id: { not: product.id } },
    take: 4,
  });

  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 py-16 grid md:grid-cols-2 gap-16">
        <ProductGallery images={product.images} videos={product.videos} name={product.name} />

        <div className="md:sticky md:top-24 md:self-start max-w-md">
          <p className="text-xs uppercase tracking-[0.2em] text-coffee-600">{product.brand}</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tightest text-coffee-900">
            {product.name}
          </h1>
          <p className="mt-4 text-xl font-medium text-coffee-800">{formatCOP(product.priceCents)}</p>
          <p className="mt-6 text-coffee-700 leading-relaxed">{product.description}</p>
          <div className="mt-10">
            <AddToCartButton product={product} />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="border-t border-cream-200">
          <h2 className="mx-auto max-w-7xl px-6 pt-16 text-2xl font-semibold tracking-tightest text-coffee-900">
            Más de {product.brand}
          </h2>
          <ProductGrid products={related} />
        </div>
      )}
    </div>
  );
}

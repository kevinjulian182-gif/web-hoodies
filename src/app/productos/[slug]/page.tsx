import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatCOP } from '@/lib/format';
import AddToCartButton from '@/components/AddToCartButton';
import ProductGallery from '@/components/ProductGallery';
import ProductGrid from '@/components/ProductGrid';
import HeartButton from '@/components/HeartButton';
import MobileBuyBar from '@/components/MobileBuyBar';

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
      <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-6 pt-6 text-xs text-coffee-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-coffee-800">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/productos" className="hover:text-coffee-800">
              Catálogo
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/productos?marca=${encodeURIComponent(product.brand)}`} className="hover:text-coffee-800">
              {product.brand}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-coffee-800" aria-current="page">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="mx-auto max-w-6xl px-6 pb-16 pt-6 grid md:grid-cols-2 gap-16">
        <ProductGallery images={product.images} videos={product.videos} name={product.name} />

        <div id="comprar" className="md:sticky md:top-24 md:self-start max-w-md scroll-mt-24">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-coffee-600">{product.brand}</p>
              <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tightest text-coffee-900">
                {product.name}
              </h1>
            </div>
            <HeartButton
              productId={product.id}
              size={22}
              className="mt-1 shrink-0 text-coffee-700 hover:text-coffee-900 transition-colors"
            />
          </div>
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

      <MobileBuyBar name={product.name} priceCents={product.priceCents} />
    </div>
  );
}

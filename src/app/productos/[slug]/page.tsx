import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatCOP } from '@/lib/format';
import { isOnSale, discountPercent } from '@/lib/discount';
import AddToCartButton from '@/components/AddToCartButton';
import ProductGallery from '@/components/ProductGallery';
import ProductGrid from '@/components/ProductGrid';
import HeartButton from '@/components/HeartButton';
import MobileBuyBar from '@/components/MobileBuyBar';
import ReviewsSection from '@/components/ReviewsSection';
import ComparisonTable from '@/components/ComparisonTable';
import FaqSection from '@/components/FaqSection';
import { getSiteContent, getFaqItems } from '@/lib/content';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) return { title: 'Producto no encontrado — AFRA' };
  return {
    title: `${product.name} — ${product.brand} — AFRA`,
    description: `${product.description} Pago contra entrega y envíos a toda Colombia.`,
    openGraph: product.images[0] ? { images: [product.images[0]] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product || !product.active) notFound();

  const [related, reviews, content] = await Promise.all([
    prisma.product.findMany({
      where: { brand: product.brand, active: true, id: { not: product.id } },
      take: 4,
    }),
    prisma.review.findMany({ where: { productId: product.id }, orderBy: { createdAt: 'desc' } }),
    getSiteContent(),
  ]);

  const onSale = isOnSale(product.priceCents, product.compareAtPriceCents);
  const details = product.details
    ? product.details.split('\n').map((line) => line.trim()).filter(Boolean)
    : [];

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-6 pt-6 text-xs text-coffee-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="transition-colors hover:text-coffee-800">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/productos" className="transition-colors hover:text-coffee-800">
              Catálogo
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/productos?marca=${encodeURIComponent(product.brand)}`}
              className="transition-colors hover:text-coffee-800"
            >
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
        <ProductGallery images={product.images} videos={product.videos} name={`${product.brand} ${product.name}`} />

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
          <div className="mt-4 flex items-center gap-3">
            <p className={`text-xl font-medium ${onSale ? 'text-red-700' : 'text-coffee-800'}`}>
              {formatCOP(product.priceCents)}
            </p>
            {onSale && (
              <>
                <p className="text-base text-coffee-400 line-through">{formatCOP(product.compareAtPriceCents as number)}</p>
                <span className="rounded-full bg-red-700 px-2.5 py-1 text-xs font-semibold text-cream-50">
                  -{discountPercent(product.priceCents, product.compareAtPriceCents as number)}%
                </span>
              </>
            )}
          </div>
          <p className="mt-6 text-coffee-700 leading-relaxed">{product.description}</p>
          <div className="mt-10">
            <AddToCartButton product={product} />
          </div>

          <ul className="mt-8 space-y-3 border-t border-cream-200 pt-6">
            <li className="flex items-start gap-3 text-sm text-coffee-700">
              <CheckIcon />
              <span>
                <strong className="font-medium text-coffee-900">Pago contra entrega:</strong> revisa tu
                pedido y paga en efectivo o con tarjeta cuando lo recibas.
              </span>
            </li>
            <li className="flex items-start gap-3 text-sm text-coffee-700">
              <CheckIcon />
              <span>
                <strong className="font-medium text-coffee-900">100% original:</strong> pieza verificada
                de {product.brand}, sin réplicas.
              </span>
            </li>
            <li className="flex items-start gap-3 text-sm text-coffee-700">
              <CheckIcon />
              <span>
                <strong className="font-medium text-coffee-900">Envíos a toda Colombia:</strong> 2-5 días
                hábiles según tu ciudad.
              </span>
            </li>
          </ul>

          {details.length > 0 && (
            <div className="mt-6 border-t border-cream-200 pt-6 text-sm text-coffee-600">
              <p className="font-medium text-coffee-900">Detalles del producto</p>
              <ul className="mt-2 space-y-1.5 leading-relaxed">
                {details.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-coffee-400" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 border-t border-cream-200 pt-6 text-sm text-coffee-600">
            <p className="font-medium text-coffee-900">Materiales</p>
            <p className="mt-2 leading-relaxed">
              {product.materials || 'Algodón pesado y felpa francesa de gramaje alto.'}
            </p>
          </div>

          <div className="mt-6 border-t border-cream-200 pt-6 text-sm text-coffee-600">
            <p className="font-medium text-coffee-900">Talla y cuidado</p>
            <p className="mt-2 leading-relaxed">
              {product.careInstructions ||
                'Guía de tallas en formato US. Si dudas entre dos tallas, elige la más grande para un calce más relajado. Lava en frío, del revés y evita la secadora para conservar la impresión y el bordado.'}
            </p>
          </div>
        </div>
      </div>

      <ReviewsSection title={content['pdp.reviews_title']} reviews={reviews} />
      <ComparisonTable current={product} others={related.slice(0, 3)} />

      {related.length > 0 && (
        <div className="border-t border-cream-200">
          <h2 className="mx-auto max-w-7xl px-6 pt-16 text-2xl font-semibold tracking-tightest text-coffee-900">
            Más de {product.brand}
          </h2>
          <ProductGrid products={related} />
        </div>
      )}

      <FaqSection title={content['pdp.faq_title']} items={getFaqItems(content)} />

      <MobileBuyBar name={product.name} priceCents={product.priceCents} />
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="mt-0.5 shrink-0 text-coffee-600"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

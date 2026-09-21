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

  const related = await prisma.product.findMany({
    where: { brand: product.brand, active: true, id: { not: product.id } },
    take: 4,
  });

  const onSale = isOnSale(product.priceCents, product.compareAtPriceCents);

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

          <div className="mt-6 border-t border-cream-200 pt-6 text-sm text-coffee-600">
            <p className="font-medium text-coffee-900">Talla y cuidado</p>
            <p className="mt-2 leading-relaxed">
              Guía de tallas en formato US. Si dudas entre dos tallas, elige la más grande para un
              calce más relajado. Lava en frío, del revés y evita la secadora para conservar la
              impresión y el bordado.
            </p>
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

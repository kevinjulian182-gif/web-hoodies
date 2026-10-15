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
import { parseColorImages } from '@/lib/colors';
import { ProductColorProvider } from '@/lib/productColor';
import { getStoreWhatsAppNumber } from '@/lib/whatsapp';

// Cached per slug and served statically between revalidations — product
// edits and new reviews invalidate this specific page immediately via
// revalidateProduct(slug), the 60s window self-heals stock changes from
// checkout without needing every write path wired to revalidate.
export const revalidate = 60;

// Without this, a [slug] route renders dynamically (DB round-trip) on every
// request — `revalidate` only applies once a param list exists. It's
// deliberately empty: each product page is rendered on its first visit and
// cached from then on. Pre-rendering every product at build time instead
// made Vercel builds fail intermittently — with connection_limit=1, dozens
// of pages' queries queue on one connection to Supabase and overrun
// Prisma's 10s pool timeout.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) return { title: 'Producto no encontrado — Paramo' };
  return {
    title: `${product.name} — ${product.brand} — Paramo`,
    description: `${product.description} Pago contra entrega y envíos a toda Colombia.`,
    openGraph: product.images[0] ? { images: [product.images[0]] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug }, include: { variants: true } });
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
  const details = toBullets(product.details);
  const materials = toBullets(product.materials);
  const care = toBullets(product.careInstructions);
  const whatsappNumber = getStoreWhatsAppNumber(content);

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

      <ProductColorProvider defaultColor={product.colors[0] ?? ''} validColors={product.colors}>
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-6 grid md:grid-cols-2 gap-16">
        <ProductGallery
          images={product.images}
          colorImages={parseColorImages(product.colorImages)}
          videos={product.videos}
          name={`${product.brand} ${product.name}`}
        />

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
          <div className="mt-8">
            <AddToCartButton product={product} whatsappNumber={whatsappNumber} />
          </div>

          <ul className="mt-8 divide-y divide-cream-200 rounded-2xl border border-cream-200">
            <TrustRow title="Pago contra entrega">Revisa tu pedido y paga en efectivo o con tarjeta al recibirlo.</TrustRow>
            <TrustRow title="Garantía de cambio">Si no te queda bien, la cambias sin costo dentro de 5 días hábiles.</TrustRow>
            <TrustRow title="Envíos a toda Colombia">2-5 días hábiles según tu ciudad.</TrustRow>
          </ul>
        </div>
      </div>
      </ProductColorProvider>

      {/* Product info gets the full page width instead of being stacked in
          the narrow buy column, where it left the rest of the row empty. */}
      <section className="border-t border-cream-200">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1fr_1.35fr] md:gap-16 md:py-20">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-coffee-500">Sobre la prenda</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tightest text-coffee-900 md:text-3xl">{product.name}</h2>
            {product.description && (
              <p className="mt-5 text-base leading-relaxed text-coffee-700 md:text-lg">{product.description}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {details.length > 0 && (
              <InfoCard icon={<TagIcon />} title="Detalles" className="sm:col-span-2">
                <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {details.map((d) => (
                    <li key={d} className="flex items-start gap-2.5">
                      <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-coffee-400" aria-hidden="true" />
                      <span className="first-letter:uppercase">{d}</span>
                    </li>
                  ))}
                </ul>
              </InfoCard>
            )}
            <InfoCard icon={<FabricIcon />} title="Materiales">
              <BulletText items={materials} fallback="Algodón pesado y felpa francesa de gramaje alto." />
            </InfoCard>
            <InfoCard icon={<DropletIcon />} title="Talla y cuidado">
              <BulletText
                items={care}
                fallback="Si dudas entre dos tallas, elige la más grande para un calce más relajado. Lava en frío, del revés y evita la secadora."
              />
            </InfoCard>
          </div>
        </div>
      </section>

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

function TagIcon() {
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
      <path d="M11.5 3H5a2 2 0 0 0-2 2v6.5a2 2 0 0 0 .6 1.4l9 9a2 2 0 0 0 2.8 0l6.5-6.5a2 2 0 0 0 0-2.8l-9-9a2 2 0 0 0-1.4-.6Z" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.4" />
    </svg>
  );
}

function FabricIcon() {
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
      <path d="M4 4c2 1.5 2 3 0 4.5S2 12 4 13.5" strokeLinecap="round" />
      <path d="M9 4c2 1.5 2 3 0 4.5S7 12 9 13.5" strokeLinecap="round" />
      <path d="M14 4c2 1.5 2 3 0 4.5S12 12 14 13.5" strokeLinecap="round" />
      <path d="M4 18h16" strokeLinecap="round" />
      <path d="M4 21h16" strokeLinecap="round" />
    </svg>
  );
}

function DropletIcon() {
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
      <path d="M12 3s6.5 7.2 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10.2 12 3 12 3Z" strokeLinejoin="round" />
    </svg>
  );
}

// Admin text fields are typed with auto-bullets ("• ..." per line) and
// sometimes several on one line ("• Algodón 80% • Poliéster 20%"); split on
// both and strip the bullet characters so the UI draws its own markers.
function toBullets(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n|\s[•·]\s/)
    .map((line) => line.replace(/^[\s•·*-]+/, '').trim())
    .filter(Boolean);
}

function InfoCard({
  icon,
  title,
  className = '',
  children,
}: {
  icon: React.ReactNode;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl bg-cream-100/60 p-5 md:p-6 ${className}`}>
      <div className="mb-3 flex items-center gap-2.5 text-coffee-900">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="text-sm leading-relaxed text-coffee-700">{children}</div>
    </div>
  );
}

function BulletText({ items, fallback }: { items: string[]; fallback: string }) {
  if (items.length === 0) return <p>{fallback}</p>;
  if (items.length === 1) return <p className="first-letter:uppercase">{items[0]}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-coffee-400" aria-hidden="true" />
          <span className="first-letter:uppercase">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TrustRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3.5 text-sm">
      <CheckIcon />
      <span className="text-coffee-600">
        <strong className="block font-medium text-coffee-900">{title}</strong>
        {children}
      </span>
    </li>
  );
}

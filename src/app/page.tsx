import Link from 'next/link';
import Hero from '@/components/Hero';
import BrandSpotlight from '@/components/BrandSpotlight';
import ProductGrid from '@/components/ProductGrid';
import TrustSection from '@/components/TrustSection';
import NewsletterForm from '@/components/NewsletterForm';
import { prisma } from '@/lib/prisma';
import { isOnSale } from '@/lib/discount';
import { getSiteContent, getHomeSectionOrder, getHeroImages, type HomeSectionId } from '@/lib/content';
import type { Product } from '@prisma/client';
import type { SiteContent } from '@/lib/content';

export const dynamic = 'force-dynamic';

function renderSection(
  id: HomeSectionId,
  content: SiteContent,
  products: Product[],
  promoProducts: Product[],
  isFirst: boolean
) {
  switch (id) {
    case 'hero':
      return (
        <Hero
          key={id}
          overlapNav={isFirst}
          content={{
            eyebrow: content['hero.eyebrow'],
            titleLine1: content['hero.title_line1'],
            titleLine2: content['hero.title_line2'],
            subtitle: content['hero.subtitle'],
            cta: content['hero.cta'],
            videoUrl: content['hero.video_url'] || undefined,
            images: getHeroImages(content),
          }}
        />
      );
    case 'spotlight':
      return (
        <BrandSpotlight
          key={id}
          content={{
            eyebrow: content['spotlight.eyebrow'],
            titleLine1: content['spotlight.title'],
            titleLine2: content['spotlight.title_line2'],
            body: content['spotlight.body'],
            cta: content['spotlight.cta'],
          }}
        />
      );
    case 'products':
      return <ProductGrid key={id} products={products} />;
    case 'promos':
      if (promoProducts.length === 0) return null;
      return (
        <div key={id} className="border-t border-cream-200">
          <div className="mx-auto flex max-w-7xl items-end justify-between px-6 pt-12">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-700">Por tiempo limitado</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tightest text-coffee-900">Promociones</h2>
            </div>
            <Link href="/promos" className="text-sm font-medium text-coffee-700 hover:text-coffee-900">
              Ver todas →
            </Link>
          </div>
          <ProductGrid products={promoProducts} />
        </div>
      );
    case 'trust':
      return (
        <TrustSection
          key={id}
          content={{
            item1Title: content['trust.item1_title'],
            item1Body: content['trust.item1_body'],
            item2Title: content['trust.item2_title'],
            item2Body: content['trust.item2_body'],
            item3Title: content['trust.item3_title'],
            item3Body: content['trust.item3_body'],
          }}
        />
      );
    case 'newsletter':
      return (
        <section key={id} className="bg-cream-100 py-20 px-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tightest text-coffee-900 mb-3">
            {content['home.newsletter_title']}
          </h2>
          <p className="text-coffee-600 mb-6">{content['home.newsletter_body']}</p>
          <NewsletterForm />
        </section>
      );
    default:
      return null;
  }
}

export default async function HomePage() {
  const [products, allActive, content] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.product.findMany({ where: { active: true } }),
    getSiteContent(),
  ]);

  const promoProducts = allActive.filter((p) => isOnSale(p.priceCents, p.compareAtPriceCents)).slice(0, 4);
  const order = getHomeSectionOrder(content);

  return <>{order.map((id, index) => renderSection(id, content, products, promoProducts, index === 0))}</>;
}

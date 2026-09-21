import Hero from '@/components/Hero';
import BrandSpotlight from '@/components/BrandSpotlight';
import ProductGrid from '@/components/ProductGrid';
import TrustSection from '@/components/TrustSection';
import NewsletterForm from '@/components/NewsletterForm';
import { prisma } from '@/lib/prisma';
import { getSiteContent, getHomeSectionOrder, getHeroImages, type HomeSectionId } from '@/lib/content';
import type { Product } from '@prisma/client';
import type { SiteContent } from '@/lib/content';

export const dynamic = 'force-dynamic';

function renderSection(id: HomeSectionId, content: SiteContent, products: Product[]) {
  switch (id) {
    case 'hero':
      return (
        <Hero
          key={id}
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
  const [products, content] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    getSiteContent(),
  ]);

  const order = getHomeSectionOrder(content);

  return <>{order.map((id) => renderSection(id, content, products))}</>;
}

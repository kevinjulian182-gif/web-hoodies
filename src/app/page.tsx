import Link from 'next/link';
import Hero from '@/components/Hero';
import BrandSpotlight from '@/components/BrandSpotlight';
import ProductGrid from '@/components/ProductGrid';
import TrustSection from '@/components/TrustSection';
import NewsletterForm from '@/components/NewsletterForm';
import HowItWorks from '@/components/HowItWorks';
import FeatureSplit from '@/components/FeatureSplit';
import FaqSection from '@/components/FaqSection';
import BrandsSection from '@/components/BrandsSection';
import FinalCta from '@/components/FinalCta';
import { prisma } from '@/lib/prisma';
import { isOnSale } from '@/lib/discount';
import {
  getSiteContent,
  getHomeSectionOrder,
  getHeroImages,
  getFaqItems,
  getBrandItems,
  type HomeSectionId,
} from '@/lib/content';
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
            <Link href="/promos" className="text-sm font-medium text-coffee-700 transition-colors hover:text-coffee-900">
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
    case 'brands':
      return <BrandsSection key={id} brands={getBrandItems(content)} />;
    case 'howwork':
      return (
        <HowItWorks
          key={id}
          content={{
            eyebrow: content['howwork.eyebrow'],
            title: content['howwork.title'],
            steps: [
              { title: content['howwork.step1_title'], body: content['howwork.step1_body'] },
              { title: content['howwork.step2_title'], body: content['howwork.step2_body'] },
              { title: content['howwork.step3_title'], body: content['howwork.step3_body'] },
              { title: content['howwork.step4_title'], body: content['howwork.step4_body'] },
            ],
          }}
        />
      );
    case 'quality':
      return (
        <FeatureSplit
          key={id}
          tone="cream-100"
          icon={<FabricIcon />}
          content={{
            eyebrow: content['quality.eyebrow'],
            title: content['quality.title'],
            body: content['quality.body'],
            items: [
              { title: content['quality.item1_title'], body: content['quality.item1_body'] },
              { title: content['quality.item2_title'], body: content['quality.item2_body'] },
              { title: content['quality.item3_title'], body: content['quality.item3_body'] },
            ],
          }}
        />
      );
    case 'shipping':
      return (
        <FeatureSplit
          key={id}
          reverse
          icon={<ShieldIcon />}
          content={{
            eyebrow: content['shipping.eyebrow'],
            title: content['shipping.title'],
            body: content['shipping.body'],
            items: [
              { title: content['shipping.item1_title'], body: content['shipping.item1_body'] },
              { title: content['shipping.item2_title'], body: content['shipping.item2_body'] },
              { title: content['shipping.item3_title'], body: content['shipping.item3_body'] },
            ],
          }}
        />
      );
    case 'faq':
      return <FaqSection key={id} title={content['home.faq_title']} items={getFaqItems(content)} />;
    case 'cta':
      return (
        <FinalCta
          key={id}
          content={{
            eyebrow: content['cta.eyebrow'],
            title: content['cta.title'],
            body: content['cta.body'],
            buttonText: content['cta.button_text'],
            buttonHref: content['cta.button_href'],
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

function FabricIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 4c2 1.5 2 3 0 4.5S2 12 4 13.5" strokeLinecap="round" />
      <path d="M9 4c2 1.5 2 3 0 4.5S7 12 9 13.5" strokeLinecap="round" />
      <path d="M14 4c2 1.5 2 3 0 4.5S12 12 14 13.5" strokeLinecap="round" />
      <path d="M4 18h16" strokeLinecap="round" />
      <path d="M4 21h16" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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

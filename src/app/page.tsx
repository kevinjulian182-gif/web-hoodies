import Hero from '@/components/Hero';
import ProductGrid from '@/components/ProductGrid';
import TrustSection from '@/components/TrustSection';
import NewsletterForm from '@/components/NewsletterForm';
import { prisma } from '@/lib/prisma';
import { getSiteContent } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [products, content] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    getSiteContent(),
  ]);

  return (
    <>
      <Hero
        content={{
          eyebrow: content['hero.eyebrow'],
          titleLine1: content['hero.title_line1'],
          titleLine2: content['hero.title_line2'],
          subtitle: content['hero.subtitle'],
          cta: content['hero.cta'],
        }}
      />
      <ProductGrid products={products} />
      <TrustSection
        content={{
          item1Title: content['trust.item1_title'],
          item1Body: content['trust.item1_body'],
          item2Title: content['trust.item2_title'],
          item2Body: content['trust.item2_body'],
          item3Title: content['trust.item3_title'],
          item3Body: content['trust.item3_body'],
        }}
      />
      <section className="bg-cream-100 py-20 px-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tightest text-coffee-900 mb-3">
          {content['home.newsletter_title']}
        </h2>
        <p className="text-coffee-600 mb-6">{content['home.newsletter_body']}</p>
        <NewsletterForm />
      </section>
    </>
  );
}

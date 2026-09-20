import Hero from '@/components/Hero';
import ProductGrid from '@/components/ProductGrid';
import NewsletterForm from '@/components/NewsletterForm';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  return (
    <>
      <Hero />
      <ProductGrid products={products} />
      <section className="bg-cream-100 py-20 px-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tightest text-coffee-900 mb-3">
          Sé el primero en enterarte
        </h2>
        <p className="text-coffee-600 mb-6">Lanzamientos exclusivos y promociones, directo a tu correo.</p>
        <NewsletterForm />
      </section>
    </>
  );
}

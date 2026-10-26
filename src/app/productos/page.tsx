import type { Metadata } from 'next';
import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { getSiteContent } from '@/lib/content';
import { sortByAdminOrder } from '@/lib/productOrder';
import CatalogClient from './CatalogClient';

// Cached and served statically between revalidations — product/brand
// edits invalidate this immediately via revalidateProductListings(), the
// 60s window self-heals stock changes from checkout without needing every
// write path wired to revalidate.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Catálogo de hoodies, chaquetas y streetwear de marca',
  alternates: { canonical: '/productos' },
  description:
    'Explora el catálogo completo de streetwear premium de AFRA: Nike, Adidas, Supreme y más, con garantía y envíos a toda Colombia.',
};

export default async function CatalogPage() {
  const [unordered, brands, content] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.brand.findMany({ select: { name: true, logoUrl: true }, orderBy: { name: 'asc' } }),
    getSiteContent(),
  ]);
  const products = sortByAdminOrder(unordered, content['catalog.product_order']);

  return (
    <div className="pt-8">
      <h1 className="mx-auto max-w-screen-2xl px-6 text-3xl md:px-10 font-semibold tracking-tightest text-coffee-900">
        Catálogo
      </h1>
      <Suspense fallback={null}>
        <CatalogClient products={products} brandLogos={brands} />
      </Suspense>
    </div>
  );
}

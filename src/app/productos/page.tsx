import type { Metadata } from 'next';
import ProductGrid from '@/components/ProductGrid';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ marca?: string }>;
}): Promise<Metadata> {
  const { marca } = await searchParams;
  return marca
    ? {
        title: `${marca} — Catálogo — AFRA`,
        description: `Hoodies, sudaderas y chaquetas originales de ${marca}, disponibles en AFRA con pago contra entrega en toda Colombia.`,
      }
    : {
        title: 'Catálogo — AFRA',
        description: 'Explora el catálogo completo de streetwear original de AFRA: Nike, Adidas, Supreme y más, con envíos a toda Colombia.',
      };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ marca?: string }>;
}) {
  const { marca } = await searchParams;
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="pt-8">
      <h1 className="mx-auto max-w-7xl px-6 text-3xl font-semibold tracking-tightest text-coffee-900">
        Catálogo
      </h1>
      <ProductGrid products={products} initialBrand={marca} />
    </div>
  );
}

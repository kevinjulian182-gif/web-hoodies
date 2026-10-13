'use client';

import { useSearchParams } from 'next/navigation';
import ProductGrid, { type BrandLogo } from '@/components/ProductGrid';
import type { Product } from '@prisma/client';

type PublicProduct = Omit<Product, 'costCents'>;

// Reads ?marca= client-side instead of the page reading it as a server
// searchParams prop — a server-side read of searchParams forces the whole
// route to render dynamically on every request (no caching), and the
// product list itself doesn't depend on marca at all (ProductGrid already
// filters it client-side), so there's nothing to gain from blocking the
// page's cache on it.
export default function CatalogClient({
  products,
  brandLogos,
}: {
  products: PublicProduct[];
  brandLogos: BrandLogo[];
}) {
  const searchParams = useSearchParams();
  const marca = searchParams.get('marca') ?? undefined;
  return <ProductGrid products={products} initialBrand={marca} brandLogos={brandLogos} />;
}

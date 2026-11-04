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
  const tipo = searchParams.get('tipo') ?? undefined;
  const talla = searchParams.get('talla') ?? undefined;
  // Keyed on the params so arriving at a new ?marca=/?tipo=/?talla= while already
  // on the catalog re-applies them instead of keeping the old filters.
  return (
    <ProductGrid
      key={`${marca ?? ''}|${tipo ?? ''}|${talla ?? ''}`}
      products={products}
      initialBrand={marca}
      initialCategory={tipo}
      initialSize={talla}
      brandLogos={brandLogos}
    />
  );
}

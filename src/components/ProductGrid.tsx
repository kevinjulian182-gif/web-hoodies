'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@prisma/client';

type PublicProduct = Omit<Product, 'costCents'>;
type BrandLogo = { name: string; logoUrl: string | null };

// Groups near-duplicate labels that only differ in case or stray whitespace
// (e.g. an admin typing "Fear of God" on one product and "FEAR OF GOD" on
// another) so the filter row shows one chip instead of two that read
// identically once the UI uppercases them for display.
function dedupeLabels(values: (string | null)[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of values) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

export default function ProductGrid({
  products,
  initialBrand,
  brandLogos = [],
}: {
  products: PublicProduct[];
  initialBrand?: string;
  brandLogos?: BrandLogo[];
}) {
  const brands = useMemo(() => dedupeLabels(products.map((p) => p.brand)), [products]);
  const logoByBrand = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of brandLogos) {
      if (b.logoUrl) map.set(b.name.trim().toLowerCase(), b.logoUrl);
    }
    return map;
  }, [brandLogos]);
  const [activeBrand, setActiveBrand] = useState<string | null>(
    initialBrand && brands.some((b) => b.toLowerCase() === initialBrand.toLowerCase()) ? initialBrand : null
  );
  const categories = useMemo(() => dedupeLabels(products.map((p) => p.category)), [products]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = products.filter(
    (p) =>
      (!activeBrand || p.brand.trim().toLowerCase() === activeBrand.toLowerCase()) &&
      (!activeCategory || p.category?.trim().toLowerCase() === activeCategory.toLowerCase())
  );

  if (products.length === 0) {
    return <p className="text-center text-coffee-600 py-24">Pronto nuevas piezas.</p>;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-20">
      {(brands.length > 1 || categories.length > 0) && (
        <div className="mb-14 space-y-4 border-b border-cream-200 pb-8">
          {brands.length > 1 && (
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-coffee-400">Marca</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip label="Todas" active={activeBrand === null} onClick={() => setActiveBrand(null)} />
                {brands.map((brand) => (
                  <FilterChip
                    key={brand}
                    label={brand}
                    logo={logoByBrand.get(brand.toLowerCase())}
                    active={activeBrand?.toLowerCase() === brand.toLowerCase()}
                    onClick={() => setActiveBrand(brand)}
                  />
                ))}
              </div>
            </div>
          )}
          {categories.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-coffee-400">Tipo de prenda</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip label="Todos" active={activeCategory === null} onClick={() => setActiveCategory(null)} />
                {categories.map((category) => (
                  <FilterChip
                    key={category}
                    label={category}
                    active={activeCategory?.toLowerCase() === category.toLowerCase()}
                    onClick={() => setActiveCategory(category)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <motion.div layout className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-16 md:gap-x-10 md:gap-y-20 lg:grid-cols-4">
        {filtered.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </motion.div>
    </div>
  );
}

function FilterChip({
  label,
  logo,
  active,
  onClick,
}: {
  label: string;
  logo?: string;
  active: boolean;
  onClick: () => void;
}) {
  if (logo) {
    return (
      <button
        onClick={onClick}
        title={label}
        aria-label={label}
        className={`flex h-9 items-center rounded-full border bg-white px-3 transition-all duration-200 ${
          active ? 'border-coffee-900 ring-1 ring-coffee-900' : 'border-cream-300/80 hover:border-coffee-400'
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt={label} className="h-5 max-w-[88px] object-contain" />
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`flex h-9 items-center rounded-full border px-3.5 text-[11px] uppercase tracking-[0.1em] transition-all duration-200 ${
        active
          ? 'border-coffee-900 bg-coffee-900 font-medium text-cream-50'
          : 'border-cream-300/80 font-normal text-coffee-600 hover:border-coffee-400 hover:text-coffee-900'
      }`}
    >
      {label}
    </button>
  );
}

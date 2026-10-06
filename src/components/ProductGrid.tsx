'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@prisma/client';

type PublicProduct = Omit<Product, 'costCents'>;

export default function ProductGrid({
  products,
  initialBrand,
}: {
  products: PublicProduct[];
  initialBrand?: string;
}) {
  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))).sort(), [products]);
  const [activeBrand, setActiveBrand] = useState<string | null>(
    initialBrand && brands.includes(initialBrand) ? initialBrand : null
  );
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter((c): c is string => !!c))).sort(),
    [products]
  );
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = products.filter(
    (p) => (!activeBrand || p.brand === activeBrand) && (!activeCategory || p.category === activeCategory)
  );

  if (products.length === 0) {
    return <p className="text-center text-coffee-600 py-24">Pronto nuevas piezas.</p>;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-20">
      {(brands.length > 1 || categories.length > 0) && (
        <div className="mb-12 space-y-3">
          {brands.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <FilterChip label="Todas" active={activeBrand === null} onClick={() => setActiveBrand(null)} />
              {brands.map((brand) => (
                <FilterChip
                  key={brand}
                  label={brand}
                  active={activeBrand === brand}
                  onClick={() => setActiveBrand(brand)}
                />
              ))}
            </div>
          )}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <FilterChip label="Todos los tipos" active={activeCategory === null} onClick={() => setActiveCategory(null)} />
              {categories.map((category) => (
                <FilterChip
                  key={category}
                  label={category}
                  active={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                />
              ))}
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

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
        active
          ? 'border-coffee-900 bg-coffee-900 text-cream-50'
          : 'border-cream-200 text-coffee-700 hover:border-coffee-600'
      }`}
    >
      {label}
    </button>
  );
}

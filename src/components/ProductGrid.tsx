'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@prisma/client';

export default function ProductGrid({
  products,
  initialBrand,
}: {
  products: Product[];
  initialBrand?: string;
}) {
  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))).sort(), [products]);
  const [activeBrand, setActiveBrand] = useState<string | null>(
    initialBrand && brands.includes(initialBrand) ? initialBrand : null
  );

  const filtered = activeBrand ? products.filter((p) => p.brand === activeBrand) : products;

  if (products.length === 0) {
    return <p className="text-center text-coffee-600 py-24">Pronto nuevas piezas.</p>;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      {brands.length > 1 && (
        <div className="mb-10 flex flex-wrap gap-2">
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

      <motion.div layout className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
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

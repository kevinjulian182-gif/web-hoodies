'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { BrandItem } from '@/lib/content';

export default function BrandsSection({ brands }: { brands: BrandItem[] }) {
  if (brands.length === 0) return null;

  return (
    <section className="border-t border-cream-200 bg-cream-50">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-coffee-500">Curado por marca</p>
            <h2 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tightest text-coffee-900">
              Compra por marca
            </h2>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {brands.map((brand, i) => (
            <motion.div
              key={brand.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Link
                href={`/productos?marca=${encodeURIComponent(brand.name)}`}
                className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-cream-200 bg-cream-50 px-4 text-center transition-colors hover:border-coffee-500"
              >
                {brand.logoUrl ? (
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    width={140}
                    height={72}
                    className="h-16 w-auto max-w-[85%] object-contain"
                  />
                ) : (
                  <span className="text-base font-semibold tracking-tightest text-coffee-900">{brand.name}</span>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatCOP } from '@/lib/format';
import type { Product } from '@prisma/client';

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/productos/${product.slug}`} className="group block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-cream-100">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-cream-50/95 backdrop-blur-sm py-3 text-center text-xs font-medium uppercase tracking-[0.15em] text-coffee-900 transition-transform duration-300 ease-out group-hover:translate-y-0">
            Ver producto
          </div>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-coffee-600">{product.brand}</p>
            <h3 className="text-base font-medium text-coffee-900">{product.name}</h3>
          </div>
          <p className="text-sm font-semibold text-coffee-800">{formatCOP(product.priceCents)}</p>
        </div>
      </Link>
    </motion.div>
  );
}

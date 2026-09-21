'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatCOP } from '@/lib/format';
import { colorToHex } from '@/lib/colors';
import { useCart } from '@/lib/cart';
import HeartButton from '@/components/HeartButton';
import type { Product } from '@prisma/client';

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { addItem } = useCart();
  const [size, setSize] = useState(product.sizes[0] ?? '');
  const [color, setColor] = useState(product.colors[0] ?? '');
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: product.images[0] ?? '',
      size,
      color: color || undefined,
      priceCents: product.priceCents,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
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

          <HeartButton
            productId={product.id}
            size={16}
            className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-cream-50/90 text-coffee-900 backdrop-blur-sm transition-transform hover:scale-110"
          />
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-coffee-600">{product.brand}</p>
            <h3 className="text-base font-medium text-coffee-900">{product.name}</h3>
          </div>
          <p className="text-sm font-semibold text-coffee-800">{formatCOP(product.priceCents)}</p>
        </div>

        <div className="mt-3 space-y-2">
          {product.colors.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.colors.map((c) => (
                <button
                  key={c}
                  title={c}
                  aria-label={c}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setColor(c);
                  }}
                  className={`h-5 w-5 rounded-full border-2 transition-transform ${
                    color === c ? 'border-coffee-900 scale-110' : 'border-transparent'
                  }`}
                >
                  <span className="block h-full w-full rounded-full" style={{ backgroundColor: colorToHex(c) }} />
                </button>
              ))}
            </div>
          )}
          {product.sizes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSize(s);
                  }}
                  className={`h-7 min-w-7 rounded-full px-1.5 text-[11px] font-medium border transition-colors ${
                    size === s
                      ? 'bg-coffee-900 text-cream-50 border-coffee-900'
                      : 'border-cream-300 text-coffee-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={handleAdd}
            className="w-full rounded-full bg-coffee-900 py-2 text-[11px] font-medium uppercase tracking-wide text-cream-50"
          >
            {added ? 'Agregado ✓' : 'Agregar al carrito'}
          </button>
        </div>
      </Link>
    </motion.div>
  );
}

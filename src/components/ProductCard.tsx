'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatCOP } from '@/lib/format';
import { colorToHex } from '@/lib/colors';
import { isOnSale, discountPercent } from '@/lib/discount';
import { useCart } from '@/lib/cart';
import HeartButton from '@/components/HeartButton';
import type { Product } from '@prisma/client';

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { addItem } = useCart();
  const onSale = isOnSale(product.priceCents, product.compareAtPriceCents);
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
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-cream-50">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt={`${product.brand} ${product.name}`}
              fill
              className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
                product.images[1] ? 'group-hover:opacity-0' : ''
              }`}
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          )}
          {product.images[1] && (
            <Image
              src={product.images[1]}
              alt={`${product.brand} ${product.name}`}
              fill
              className="object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          )}

          <HeartButton
            productId={product.id}
            size={16}
            className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-cream-50/90 text-coffee-900 backdrop-blur-sm transition-transform hover:scale-110"
          />
          {onSale && (
            <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-red-700 px-2.5 py-1 text-[11px] font-semibold text-cream-50">
              -{discountPercent(product.priceCents, product.compareAtPriceCents as number)}%
            </span>
          )}
        </div>

        <div className="mt-5 flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-coffee-500">{product.brand}</p>
            <h3 className="mt-1 min-h-[2.5rem] text-base font-medium leading-5 text-coffee-900 line-clamp-2">
              {product.name}
            </h3>
          </div>
          <div className="shrink-0 text-right">
            {onSale && (
              <p className="text-xs text-coffee-400 line-through">{formatCOP(product.compareAtPriceCents as number)}</p>
            )}
            <p className={`text-sm font-semibold ${onSale ? 'text-red-700' : 'text-coffee-800'}`}>
              {formatCOP(product.priceCents)}
            </p>
          </div>
        </div>

        <div className="mt-5">
          {/* Color/size pickers are desktop-only — on mobile's tighter 2-col
              grid they read as clutter, so the card there is just image,
              name, price and one clear action; picking a variant happens on
              the product page instead. Fixed height on desktop regardless of
              whether this product has colors, so the sizes/button below
              always start at the same y across every card in the row. */}
          <div className="hidden md:block">
            <div className="flex h-5 flex-wrap gap-1.5">
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
            {product.sizes.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
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
          </div>
          <button
            onClick={handleAdd}
            className="mt-2.5 w-full rounded-full bg-coffee-900 py-2.5 text-[11px] font-medium uppercase tracking-[0.15em] text-cream-50 transition-transform active:scale-[0.97]"
          >
            {added ? 'Agregado ✓' : 'Agregar al carrito'}
          </button>
        </div>
      </Link>
    </motion.div>
  );
}

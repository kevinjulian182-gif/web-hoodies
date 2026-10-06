'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatCOP } from '@/lib/format';
import { colorToHex, parseColorImages } from '@/lib/colors';
import { isOnSale, discountPercent } from '@/lib/discount';
import { useCart } from '@/lib/cart';
import { useCatalogSettings } from '@/lib/catalogSettings';
import HeartButton from '@/components/HeartButton';
import type { Product } from '@prisma/client';

type PublicProduct = Omit<Product, 'costCents'>;

export default function ProductCard({ product, index = 0 }: { product: PublicProduct; index?: number }) {
  const { addItem } = useCart();
  const { showColors, showSizes } = useCatalogSettings();
  const onSale = isOnSale(product.priceCents, product.compareAtPriceCents);
  const [size, setSize] = useState(product.sizes[0] ?? '');
  const [color, setColor] = useState(product.colors[0] ?? '');
  const [added, setAdded] = useState(false);

  // Swap the card's photos to the selected color's set, when the admin
  // added one — otherwise keep showing the product's default images.
  const colorImages = parseColorImages(product.colorImages);
  const displayImages = (color && colorImages[color]?.length ? colorImages[color] : product.images);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: displayImages[0] ?? '',
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
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-cream-200/70 bg-cream-50 transition-shadow duration-300 group-hover:shadow-[0_18px_40px_-16px_rgba(54,37,25,0.35)]">
          {displayImages[0] && (
            <Image
              src={displayImages[0]}
              alt={`${product.brand} ${product.name}`}
              fill
              className={`object-contain transition-transform duration-700 ease-out group-hover:scale-105 ${
                displayImages[1] ? 'group-hover:opacity-0' : ''
              }`}
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          )}
          {displayImages[1] && (
            <Image
              src={displayImages[1]}
              alt={`${product.brand} ${product.name}`}
              fill
              className="object-contain opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          )}

          <HeartButton
            productId={product.id}
            size={16}
            className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-cream-50/90 text-coffee-900 backdrop-blur-sm transition-transform hover:scale-110"
          />
          {onSale && (
            <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-red-800 px-2.5 py-[3px] text-[10px] font-medium tracking-wide text-cream-50">
              -{discountPercent(product.priceCents, product.compareAtPriceCents as number)}%
            </span>
          )}
        </div>

        <div className="mt-4">
          <p className="truncate text-[11px] uppercase tracking-[0.15em] text-coffee-500">{product.brand}</p>
          <h3 className="mt-1 text-sm font-medium leading-snug text-coffee-900 line-clamp-2 md:text-base">
            {product.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-2">
            <p className={`text-sm font-semibold ${onSale ? 'text-red-700' : 'text-coffee-800'}`}>
              {formatCOP(product.priceCents)}
            </p>
            {onSale && (
              <p className="text-xs text-coffee-400 line-through">{formatCOP(product.compareAtPriceCents as number)}</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          {/* Color/size pickers only render when the admin has them turned on
              (Admin > Contenido > Catálogo) — off by default for a cleaner,
              more exclusive-feeling card; picking a variant then happens on
              the product page instead. */}
          {(showColors || showSizes) && (
            <div>
              {showColors && product.colors.length > 0 && (
                <div className="flex flex-wrap items-center gap-0.5">
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
                      className="group/swatch relative flex h-7 w-7 shrink-0 items-center justify-center"
                    >
                      <span
                        className={`h-4 w-4 rounded-full border border-coffee-900/10 shadow-sm transition-transform duration-150 ${
                          color === c
                            ? 'scale-110 ring-2 ring-coffee-900 ring-offset-2 ring-offset-cream-50'
                            : 'group-hover/swatch:scale-110'
                        }`}
                        style={{ backgroundColor: colorToHex(c) }}
                      />
                    </button>
                  ))}
                </div>
              )}
              {showSizes && product.sizes.length > 0 && (
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
          )}
          <button
            onClick={handleAdd}
            className="mt-3 w-full rounded-full bg-coffee-900 py-2.5 text-[11px] font-medium uppercase tracking-[0.15em] text-cream-50 transition-colors transition-transform hover:bg-coffee-800 active:scale-[0.97]"
          >
            {added ? 'Agregado ✓' : 'Agregar al carrito'}
          </button>
        </div>
      </Link>
    </motion.div>
  );
}

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatCOP } from '@/lib/format';
import { colorToHex, parseColorImages, parseColorHex } from '@/lib/colors';
import { isOnSale, discountPercent } from '@/lib/discount';
import { useCart } from '@/lib/cart';
import { useCatalogSettings } from '@/lib/catalogSettings';
import HeartButton from '@/components/HeartButton';
import type { Product } from '@prisma/client';

type PublicProduct = Omit<Product, 'costCents'>;

export default function ProductCard({
  product,
  index = 0,
  fixedColor,
}: {
  product: PublicProduct;
  index?: number;
  // Set when this card is one color of a multi-color product, split out by
  // ProductGrid to look like an independent product: the card starts on
  // this color (swatches still let the shopper switch). Everything
  // downstream (stock, variants, checkout) still works off the single
  // underlying Product row.
  fixedColor?: string;
}) {
  const { addItem } = useCart();
  const { showColors, showSizes } = useCatalogSettings();
  const onSale = isOnSale(product.priceCents, product.compareAtPriceCents);
  const [size, setSize] = useState(product.sizes[0] ?? '');
  const [color, setColor] = useState(fixedColor ?? product.colors[0] ?? '');
  const [added, setAdded] = useState(false);

  // Swap the card's photos to the selected color's set, when the admin
  // added one — otherwise keep showing the product's default images.
  const colorImages = parseColorImages(product.colorImages);
  const colorHex = parseColorHex(product.colorHex);
  const displayImages = (color && colorImages[color]?.length ? colorImages[color] : product.images);
  // Carry the card's current color to the PDP so it opens on the same one.
  const href =
    product.colors.length > 1 && color
      ? `/productos/${product.slug}?color=${encodeURIComponent(color)}`
      : `/productos/${product.slug}`;

  const soldOut = product.stock <= 0;
  const promoWithoutMarkdown = product.isPromo && !onSale;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
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
    <div className="animate-fade-up h-full" style={{ animationDelay: `${(index % 4) * 80}ms` }}>
      <Link href={href} className="group flex h-full flex-col">
        {/* Desktop: a warm spotlight tile that lifts on hover, with the quick
            add sliding up from inside the photo. Phones keep the plain tile
            and the always-visible button below (no hover on touch). */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-cream-200/70 bg-cream-50 transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:border-transparent md:bg-[radial-gradient(110%_85%_at_50%_35%,rgb(var(--color-cream-50))_0%,rgb(var(--color-cream-100))_70%,rgb(var(--color-cream-200)/0.7)_100%)] md:group-hover:-translate-y-1.5 md:group-hover:shadow-[0_24px_48px_-20px_rgba(54,37,25,0.45)]">
          {displayImages[0] && (
            <Image
              src={displayImages[0]}
              alt={`${product.brand} ${product.name}`}
              fill
              className={`object-contain transition-[transform,opacity] duration-700 ease-out group-hover:scale-105 md:p-3 ${
                displayImages[1] ? 'group-hover:opacity-0' : ''
              } ${soldOut ? 'opacity-50 grayscale' : ''}`}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          )}
          {displayImages[1] && (
            <Image
              src={displayImages[1]}
              alt={`${product.brand} ${product.name}`}
              fill
              className="object-contain opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 md:p-3"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          )}

          <HeartButton
            productId={product.id}
            size={16}
            className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-cream-50/90 text-coffee-900 backdrop-blur-sm transition-transform hover:scale-110"
          />
          <div className="absolute left-2.5 top-2.5 z-10 flex flex-col items-start gap-1.5">
            {soldOut ? (
              <Badge className="bg-coffee-900 text-cream-50">Agotado</Badge>
            ) : (
              <>
                {onSale && (
                  <Badge className="bg-red-800 text-cream-50">
                    -{discountPercent(product.priceCents, product.compareAtPriceCents as number)}%
                  </Badge>
                )}
                {promoWithoutMarkdown && <Badge className="bg-red-800 text-cream-50">Promo</Badge>}
              </>
            )}
          </div>

          {!soldOut && (
            <button
              onClick={handleAdd}
              tabIndex={-1}
              aria-hidden="true"
              className="absolute inset-x-3 bottom-3 z-10 hidden translate-y-[calc(100%+0.75rem)] items-center justify-center gap-2 rounded-full bg-coffee-900/95 py-3 text-[11px] font-medium uppercase tracking-[0.15em] text-cream-50 opacity-0 shadow-lg backdrop-blur-sm transition-[transform,opacity,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-coffee-800 active:scale-[0.97] group-hover:translate-y-0 group-hover:opacity-100 md:flex"
            >
              {added ? 'Agregado ✓' : (
                <>
                  <PlusIcon />
                  Agregar al carrito
                </>
              )}
            </button>
          )}
        </div>

        <div className="mt-4">
          <p className="truncate text-[11px] uppercase tracking-[0.15em] text-coffee-500">{product.brand}</p>
          <h3 className="mt-1 min-h-[2.625rem] text-sm font-medium leading-snug text-coffee-900 line-clamp-2 md:min-h-[3rem] md:text-base">
            {product.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-2">
            <p className={`text-sm font-semibold md:text-[15px] ${onSale || product.isPromo ? 'text-red-700' : 'text-coffee-800'}`}>
              {formatCOP(product.priceCents)}
            </p>
            {onSale && (
              <p className="text-xs text-coffee-400 line-through">{formatCOP(product.compareAtPriceCents as number)}</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-1 flex-col">
          {/* Color/size pickers only render when the admin has them turned on
              (Admin > Contenido > Catálogo) — off by default for a cleaner,
              more exclusive-feeling card; picking a variant then happens on
              the product page instead. */}
          {(showColors || showSizes) && (
            <div className="mb-4">
              {showColors && product.colors.length > 0 && (
                <div className="flex flex-wrap gap-2">
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
                      className="group/swatch relative flex h-8 w-8 shrink-0 items-center justify-center transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-90"
                    >
                      <span
                        className={`h-[18px] w-[18px] rounded-full border border-coffee-900/10 shadow-sm transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                          color === c
                            ? 'scale-110 ring-[1.5px] ring-coffee-900 ring-offset-2 ring-offset-cream-50'
                            : 'group-hover/swatch:scale-110 group-hover/swatch:ring-1 group-hover/swatch:ring-coffee-300 group-hover/swatch:ring-offset-2 group-hover/swatch:ring-offset-cream-50'
                        }`}
                        style={{ backgroundColor: colorToHex(c, colorHex) }}
                      />
                    </button>
                  ))}
                </div>
              )}
              {showSizes && product.sizes.length > 0 && (
                <div className={`flex flex-wrap gap-1.5 ${showColors && product.colors.length > 0 ? 'mt-3' : ''}`}>
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
            disabled={soldOut}
            className="mt-auto w-full disabled:opacity-40 md:hidden whitespace-nowrap rounded-full bg-coffee-900 px-2 py-3 text-[10px] font-medium uppercase tracking-[0.08em] text-cream-50 transition-[background-color,transform] hover:bg-coffee-800 active:scale-[0.97] sm:py-2.5 sm:text-[11px] sm:tracking-[0.15em]"
          >
            {soldOut ? 'Agotado' : added ? 'Agregado ✓' : 'Agregar al carrito'}
          </button>
        </div>
      </Link>
    </div>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-[3px] text-[10px] font-medium uppercase tracking-[0.08em] ${className}`}>
      {children}
    </span>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

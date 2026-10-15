'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import ProductCard from '@/components/ProductCard';
import { expandByColor } from '@/lib/colorVariants';
import { isOnSale } from '@/lib/discount';
import type { Product } from '@prisma/client';

type PublicProduct = Omit<Product, 'costCents'>;
export type BrandLogo = { name: string; logoUrl: string | null };

const norm = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';

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
  // The filter row lists the brands managed in Admin > Productos >
  // Gestionar marcas (same list "Compra por marca" and the logos draw
  // from), not just whatever brand strings happen to appear on today's
  // products — so a brand shows up consistently everywhere once it's
  // added there, logo included. Falls back to scraping the products'
  // own brand field only where no managed list was passed in (e.g. the
  // PDP's "more from this brand" grid, which never shows a filter row
  // anyway since every item already shares one brand).
  const brands = useMemo(
    () =>
      brandLogos.length > 0
        ? [...brandLogos].map((b) => b.name).sort((a, b) => a.localeCompare(b))
        : dedupeLabels(products.map((p) => p.brand)),
    [products, brandLogos]
  );
  const logoByBrand = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of brandLogos) {
      if (b.logoUrl) map.set(norm(b.name), b.logoUrl);
    }
    return map;
  }, [brandLogos]);
  const [activeBrand, setActiveBrand] = useState<string | null>(
    initialBrand && brands.some((b) => norm(b) === norm(initialBrand)) ? initialBrand : null
  );
  const categories = useMemo(() => dedupeLabels(products.map((p) => p.category)), [products]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [promoOnly, setPromoOnly] = useState(false);

  // "Promo" covers both ways the admin marks one: the Promo flag (what
  // /promos lists) and an actual markdown (a "precio antes" above the price).
  const isPromo = (p: PublicProduct) => p.isPromo || isOnSale(p.priceCents, p.compareAtPriceCents);
  const promoProducts = products.filter(isPromo);
  // Counted in cards (one per color), the same unit as the results count.
  const promoCount = expandByColor(promoProducts).length;
  const showPromoToggle = promoProducts.length > 0 && promoProducts.length < products.length;

  const matchesBrand = (p: PublicProduct, brand: string | null) => !brand || norm(p.brand) === norm(brand);
  const matchesCategory = (p: PublicProduct, category: string | null) => !category || norm(p.category) === norm(category);
  const matchesPromo = (p: PublicProduct) => !promoOnly || isPromo(p);

  // Each option counts against the *other* active filter, so a chip that
  // would lead to an empty grid (a managed brand with no stock yet, or a
  // brand + garment combo that doesn't exist) is shown disabled instead of
  // letting the shopper tap into a blank page.
  const brandHasResults = (brand: string) =>
    products.some((p) => matchesBrand(p, brand) && matchesCategory(p, activeCategory) && matchesPromo(p));
  const categoryHasResults = (category: string) =>
    products.some((p) => matchesBrand(p, activeBrand) && matchesCategory(p, category) && matchesPromo(p));

  const filtered = products.filter((p) => matchesBrand(p, activeBrand) && matchesCategory(p, activeCategory) && matchesPromo(p));
  const cards = expandByColor(filtered);
  const hasActiveFilter = activeBrand !== null || activeCategory !== null || promoOnly;
  const clearFilters = () => {
    setActiveBrand(null);
    setActiveCategory(null);
    setPromoOnly(false);
  };

  if (products.length === 0) {
    return <p className="text-center text-coffee-600 py-24">Pronto nuevas piezas.</p>;
  }

  const showBrandRow = brands.length > 1;
  const showCategoryRow = categories.length > 1;

  return (
    <div className="mx-auto max-w-7xl px-6 pb-16 pt-10 md:pb-20 md:pt-12">
      {(showBrandRow || showCategoryRow || showPromoToggle) && (
        <div className="mb-8 space-y-5 md:mb-12">
          {showBrandRow && (
            <FilterRow label="Marca" activeKey={norm(activeBrand)}>
              <FilterChip label="Todas" active={activeBrand === null} onClick={() => setActiveBrand(null)} />
              {brands.map((brand) => {
                const active = norm(activeBrand) === norm(brand);
                return (
                  <FilterChip
                    key={brand}
                    label={brand}
                    logo={logoByBrand.get(norm(brand))}
                    active={active}
                    dimmed={activeBrand !== null && !active}
                    disabled={!active && !brandHasResults(brand)}
                    onClick={() => setActiveBrand(active ? null : brand)}
                  />
                );
              })}
            </FilterRow>
          )}
          {showCategoryRow && (
            <FilterRow label="Tipo de prenda" activeKey={norm(activeCategory)}>
              <FilterChip label="Todos" active={activeCategory === null} onClick={() => setActiveCategory(null)} />
              {categories.map((category) => {
                const active = norm(activeCategory) === norm(category);
                return (
                  <FilterChip
                    key={category}
                    label={category}
                    active={active}
                    disabled={!active && !categoryHasResults(category)}
                    onClick={() => setActiveCategory(active ? null : category)}
                  />
                );
              })}
            </FilterRow>
          )}

          <div className="flex min-h-8 items-center justify-between gap-3 border-t border-cream-200 pt-4 text-xs text-coffee-500">
            {showPromoToggle ? (
              <button
                onClick={() => setPromoOnly((on) => !on)}
                aria-pressed={promoOnly}
                className={`flex h-9 shrink-0 items-center gap-2 rounded-full border pl-1.5 pr-3.5 text-[11px] font-medium uppercase tracking-[0.1em] transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.96] ${
                  promoOnly
                    ? 'border-red-700 bg-red-700 text-cream-50'
                    : 'border-red-700/30 text-red-700 hover:border-red-700'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tracking-normal transition-colors ${
                    promoOnly ? 'bg-cream-50 text-red-700' : 'bg-red-700 text-cream-50'
                  }`}
                  aria-hidden="true"
                >
                  %
                </span>
                Promociones
                <span className={promoOnly ? 'text-cream-50/80' : 'text-red-700/60'}>{promoCount}</span>
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              <p aria-live="polite" className="whitespace-nowrap">
                {cards.length} {cards.length === 1 ? 'producto' : 'productos'}
              </p>
              {hasActiveFilter && (
                <button
                  onClick={clearFilters}
                  className="-mr-2 whitespace-nowrap rounded-full px-2 py-1.5 font-medium text-coffee-800 underline decoration-coffee-300 underline-offset-4 transition-colors hover:text-coffee-900 hover:decoration-coffee-900"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-coffee-700">No hay productos con estos filtros.</p>
          <button
            onClick={clearFilters}
            className="mt-5 rounded-full bg-coffee-900 px-6 py-3 text-sm font-medium text-cream-50 transition-transform active:scale-[0.97]"
          >
            Ver todo el catálogo
          </button>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-12 sm:gap-x-8 md:gap-x-10 md:gap-y-20 lg:grid-cols-4">
          {cards.map((card, i) => (
            <ProductCard key={card.cardKey} product={card} index={i} fixedColor={card.displayColor ?? undefined} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

// On phones each filter group is one swipeable row (instead of wrapping
// into 4-7 rows of chips that push the products below the fold); from md
// up it wraps normally since there's room. The row scrolls the selected
// chip into view so a filter preset from the URL (?marca=) isn't hidden
// off-screen to the right.
function FilterRow({ label, activeKey, children }: { label: string; activeKey: string; children: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    const chip = scroller.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!chip) return;
    const left = chip.offsetLeft - (scroller.clientWidth - chip.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [activeKey]);

  return (
    <div>
      <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-coffee-400">{label}</p>
      <div
        ref={scrollerRef}
        role="group"
        aria-label={label}
        className="scrollbar-none relative -mx-6 flex snap-x scroll-px-6 gap-2 overflow-x-auto overscroll-x-contain px-6 py-0.5 [mask-image:linear-gradient(to_right,transparent,#000_20px,#000_calc(100%-20px),transparent)] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:[mask-image:none]"
      >
        {children}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  logo,
  active,
  dimmed = false,
  disabled = false,
  onClick,
}: {
  label: string;
  logo?: string;
  active: boolean;
  dimmed?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const base =
    'flex h-10 shrink-0 snap-start items-center rounded-full border transition-[background-color,border-color,color,opacity,transform] duration-200 ease-out active:scale-[0.96] disabled:pointer-events-none md:h-9';

  if (logo) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        aria-pressed={active}
        title={disabled ? `${label} — sin productos por ahora` : label}
        aria-label={label}
        className={`${base} bg-white px-3.5 ${
          active
            ? 'border-coffee-900 ring-1 ring-coffee-900'
            : disabled
              ? 'border-cream-200 opacity-35'
              : 'border-cream-300/80 hover:border-coffee-400'
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={label}
          className={`h-5 max-w-[88px] object-contain transition-[filter,opacity] duration-200 ${
            dimmed || disabled ? 'opacity-60 grayscale' : ''
          }`}
        />
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={disabled ? `${label} — sin productos por ahora` : undefined}
      className={`${base} whitespace-nowrap px-4 text-[11px] uppercase tracking-[0.1em] ${
        active
          ? 'border-coffee-900 bg-coffee-900 font-medium text-cream-50'
          : disabled
            ? 'border-cream-200 text-coffee-600 opacity-40'
            : 'border-cream-300/80 font-normal text-coffee-600 hover:border-coffee-400 hover:text-coffee-900'
      }`}
    >
      {label}
    </button>
  );
}

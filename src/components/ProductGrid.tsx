'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { expandByColor } from '@/lib/colorVariants';
import { normalizeSize } from '@/lib/sizeChart';
import { COMMON_SIZES } from '@/lib/variants';
import type { Product } from '@prisma/client';

type PublicProduct = Omit<Product, 'costCents'>;
export type BrandLogo = { name: string; logoUrl: string | null };

const norm = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';

// Shopper-chosen grid density, remembered per browser. Class strings are
// spelled out in full so Tailwind's scanner picks them up.
type GridView = { mobile: 1 | 2; desktop: 2 | 3 | 4 };
const MOBILE_COLS = [1, 2] as const;
const DESKTOP_COLS = [2, 3, 4] as const;
const DEFAULT_VIEW: GridView = { mobile: 1, desktop: 3 };
const VIEW_STORAGE_KEY = 'afra-grid-view';
const MOBILE_GRID: Record<GridView['mobile'], string> = { 1: 'grid-cols-1', 2: 'grid-cols-2' };
const DESKTOP_GRID: Record<GridView['desktop'], string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-3 lg:grid-cols-4',
};

// Groups near-duplicate labels that only differ in case or stray whitespace
// (e.g. an admin typing "Fear of God" on one product and "FEAR OF GOD" on
// another) so the filter row shows one option instead of two.
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

// Size options in shop order: the letter scale first (XS → XXXL), then
// waist/numeric sizes ascending, then anything else (Única, S/M…).
const LETTER_ORDER = [...COMMON_SIZES, 'XXXL'].map(normalizeSize);
function sortSizes(labels: string[]): string[] {
  const rank = (label: string) => {
    const key = normalizeSize(label);
    const letter = LETTER_ORDER.indexOf(key);
    if (letter >= 0) return [0, letter] as const;
    const num = Number(key.replace(',', '.'));
    if (Number.isFinite(num)) return [1, num] as const;
    return [2, 0] as const;
  };
  return [...labels].sort((a, b) => {
    const [ga, va] = rank(a);
    const [gb, vb] = rank(b);
    return ga - gb || va - vb || a.localeCompare(b);
  });
}
function dedupeSizes(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of values) {
    const label = raw.trim();
    if (label && !seen.has(normalizeSize(label))) seen.set(normalizeSize(label), label);
  }
  return sortSizes(Array.from(seen.values()));
}

const catalogHref = (params: Record<string, string>) => `/productos?${new URLSearchParams(params).toString()}`;

export default function ProductGrid({
  products,
  initialBrand,
  initialCategory,
  initialSize,
  brandLogos = [],
  linkMode = false,
  allCategories,
  allSizes,
}: {
  products: PublicProduct[];
  initialBrand?: string;
  initialCategory?: string;
  initialSize?: string;
  brandLogos?: BrandLogo[];
  // Home page: the grid only holds a handful of products, so instead of
  // filtering them (and greying out every brand/type not in that handful)
  // each option links to the full catalog already filtered.
  linkMode?: boolean;
  // Category options to show in linkMode (the whole catalog's, not just
  // the handful of products rendered here).
  allCategories?: (string | null)[];
  // Same for sizes in linkMode.
  allSizes?: string[];
}) {
  // The brand row lists the brands managed in Admin > Productos > Gestionar
  // marcas (same list "Compra por marca" and the logos draw from), falling
  // back to the products' own brand field where no managed list is passed
  // (e.g. the PDP's "more from this brand" grid).
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
  const categories = useMemo(
    () => dedupeLabels(linkMode && allCategories ? allCategories : products.map((p) => p.category)),
    [products, linkMode, allCategories]
  );

  const [activeBrand, setActiveBrand] = useState<string | null>(
    initialBrand ? brands.find((b) => norm(b) === norm(initialBrand)) ?? null : null
  );
  const [activeCategory, setActiveCategory] = useState<string | null>(
    initialCategory ? categories.find((c) => norm(c) === norm(initialCategory)) ?? null : null
  );
  const sizes = useMemo(
    () => dedupeSizes(linkMode && allSizes ? allSizes : products.flatMap((p) => p.sizes)),
    [products, linkMode, allSizes]
  );
  // Sizes are multi-select ("S or M"), stored by normalized key so 2XL and
  // XXL count as the same size.
  const [activeSizes, setActiveSizes] = useState<string[]>(
    initialSize ? sizes.filter((sz) => normalizeSize(sz) === normalizeSize(initialSize)).map(normalizeSize) : []
  );
  const toggleSize = (size: string) => {
    const key = normalizeSize(size);
    setActiveSizes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };
  const [view, setView] = useState<GridView>(DEFAULT_VIEW);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(VIEW_STORAGE_KEY) ?? 'null');
      if (saved && MOBILE_COLS.includes(saved.mobile) && DESKTOP_COLS.includes(saved.desktop)) setView(saved);
    } catch {
      // storage unavailable or malformed — keep the default view
    }
  }, []);

  const changeView = (next: Partial<GridView>) => {
    const merged = { ...view, ...next };
    setView(merged);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // ignore — the choice just won't persist
    }
  };


  const matchesBrand = (p: PublicProduct, brand: string | null) => !brand || norm(p.brand) === norm(brand);
  const matchesCategory = (p: PublicProduct, category: string | null) => !category || norm(p.category) === norm(category);
  const matchesSizes = (p: PublicProduct, keys: string[]) =>
    keys.length === 0 || p.sizes.some((sz) => keys.includes(normalizeSize(sz)));

  // In the catalog, an option that would lead to an empty grid (a managed
  // brand with no stock yet, or a brand + garment combo that doesn't exist)
  // is shown disabled instead of letting the shopper tap into a blank page.
  // Never in linkMode: there every option opens the full catalog.
  const brandHasResults = (brand: string) =>
    linkMode ||
    products.some((p) => matchesBrand(p, brand) && matchesCategory(p, activeCategory) && matchesSizes(p, activeSizes));
  const categoryHasResults = (category: string) =>
    linkMode ||
    products.some((p) => matchesBrand(p, activeBrand) && matchesCategory(p, category) && matchesSizes(p, activeSizes));
  const sizeHasResults = (size: string) =>
    linkMode ||
    products.some(
      (p) => matchesBrand(p, activeBrand) && matchesCategory(p, activeCategory) && matchesSizes(p, [normalizeSize(size)])
    );

  const filtered = products.filter(
    (p) => matchesBrand(p, activeBrand) && matchesCategory(p, activeCategory) && matchesSizes(p, activeSizes)
  );
  const cards = expandByColor(filtered);
  const hasActiveFilter = activeBrand !== null || activeCategory !== null || activeSizes.length > 0;
  const clearFilters = () => {
    setActiveBrand(null);
    setActiveCategory(null);
    setActiveSizes([]);
  };

  if (products.length === 0) {
    return <p className="text-center text-coffee-600 py-24">Pronto nuevas piezas.</p>;
  }

  const showBrandRow = brands.length > 1;
  const showCategoryRow = categories.length > 1;
  const showSizeRow = sizes.length > 1;
  const showFilters = showBrandRow || showCategoryRow || showSizeRow;

  return (
    <div className="mx-auto max-w-screen-2xl px-6 pb-16 pt-10 md:px-10 md:pb-20 md:pt-12">
      {showFilters && (
        <div className="mb-6 rounded-2xl border border-cream-200 bg-white/50 md:mb-10">
          {/* One compact row per filter: what garment → brand → size. Label above the
              options on phones, in a fixed left column from md up. */}
          <div className="divide-y divide-cream-200">
            {showCategoryRow && (
              <FilterRow label="Tipo de prenda" activeKey={norm(activeCategory)}>
                <CategoryTile
                  label="Todo"
                  icon={<AllIcon />}
                  active={!linkMode && activeCategory === null}
                  href={linkMode ? '/productos' : undefined}
                  onClick={() => setActiveCategory(null)}
                />
                {categories.map((category) => {
                  const active = !linkMode && norm(activeCategory) === norm(category);
                  return (
                    <CategoryTile
                      key={category}
                      label={category}
                      icon={<GarmentIcon category={category} />}
                      active={active}
                      disabled={!active && !categoryHasResults(category)}
                      href={linkMode ? catalogHref({ tipo: category }) : undefined}
                      onClick={() => setActiveCategory(active ? null : category)}
                    />
                  );
                })}
              </FilterRow>
            )}

            {showBrandRow && (
              <FilterRow label="Marca" activeKey={norm(activeBrand)}>
                <BrandTile
                  label="Todas"
                  active={!linkMode && activeBrand === null}
                  href={linkMode ? '/productos' : undefined}
                  onClick={() => setActiveBrand(null)}
                />
                {brands.map((brand) => {
                  const active = !linkMode && norm(activeBrand) === norm(brand);
                  return (
                    <BrandTile
                      key={brand}
                      label={brand}
                      logo={logoByBrand.get(norm(brand))}
                      active={active}
                      dimmed={!linkMode && activeBrand !== null && !active}
                      disabled={!active && !brandHasResults(brand)}
                      href={linkMode ? catalogHref({ marca: brand }) : undefined}
                      onClick={() => setActiveBrand(active ? null : brand)}
                    />
                  );
                })}
              </FilterRow>
            )}

            {showSizeRow && (
              <FilterRow label="Talla" hint={linkMode ? undefined : 'Puedes elegir varias'} activeKey={activeSizes.join('|')}>
                {sizes.map((size) => {
                  const active = !linkMode && activeSizes.includes(normalizeSize(size));
                  return (
                    <SizeChip
                      key={size}
                      label={size}
                      active={active}
                      disabled={!active && !sizeHasResults(size)}
                      href={linkMode ? catalogHref({ talla: size }) : undefined}
                      onClick={() => toggleSize(size)}
                    />
                  );
                })}
              </FilterRow>
            )}


          </div>

          {/* Status bar: what's applied on the left, result count and grid
              density on the right. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-b-2xl border-t border-cream-200 bg-cream-100/50 px-4 py-2 text-xs text-coffee-500 md:px-5">
            {hasActiveFilter ? (
              <div className="scrollbar-none order-last -mx-4 flex w-[calc(100%+2rem)] min-w-0 items-center gap-2 overflow-x-auto px-4 [&>*]:shrink-0 md:order-none md:mx-0 md:w-auto md:flex-1 md:flex-wrap md:overflow-visible md:px-0">
                {activeCategory && <ActivePill label={activeCategory} onRemove={() => setActiveCategory(null)} />}
                {sizes
                  .filter((sz) => activeSizes.includes(normalizeSize(sz)))
                  .map((sz) => (
                    <ActivePill key={sz} label={`Talla ${sz}`} onRemove={() => toggleSize(sz)} />
                  ))}
                {activeBrand && <ActivePill label={activeBrand} onRemove={() => setActiveBrand(null)} />}
                <button
                  onClick={clearFilters}
                  className="whitespace-nowrap rounded-full px-1.5 py-1 font-medium text-coffee-800 underline decoration-coffee-300 underline-offset-4 transition-colors hover:text-coffee-900 hover:decoration-coffee-900"
                >
                  Limpiar todo
                </button>
              </div>
            ) : (
              <p className="flex-1">{linkMode ? 'Elige un filtro para ver el catálogo completo.' : 'Sin filtros aplicados.'}</p>
            )}
            <div className="ml-auto flex items-center gap-3">
              {linkMode ? (
                <Link
                  href="/productos"
                  className="whitespace-nowrap font-medium text-coffee-800 underline decoration-coffee-300 underline-offset-4 transition-colors hover:text-coffee-900 hover:decoration-coffee-900"
                >
                  Ver todo el catálogo
                </Link>
              ) : (
                <p aria-live="polite" className="whitespace-nowrap font-medium text-coffee-800">
                  {cards.length} {cards.length === 1 ? 'producto' : 'productos'}
                </p>
              )}
              <span className="h-5 w-px bg-cream-300" aria-hidden="true" />
              <ViewToggle view={view} onChange={changeView} />
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
        <div className={`grid gap-x-4 gap-y-12 sm:gap-x-6 md:gap-y-16 lg:gap-x-8 ${MOBILE_GRID[view.mobile]} ${DESKTOP_GRID[view.desktop]}`}>
          {cards.map((card, i) => (
            <ProductCard key={card.cardKey} product={card} index={i} fixedColor={card.displayColor ?? undefined} />
          ))}
        </div>
      )}
    </div>
  );
}

// A link when href is set (home → catalog), otherwise a toggle button.
function Tap({
  href,
  onClick,
  pressed,
  disabled,
  title,
  ariaLabel,
  className,
  children,
}: {
  href?: string;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  className: string;
  children: ReactNode;
}) {
  if (href) {
    return (
      <Link href={href} title={title} aria-label={ariaLabel} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </button>
  );
}

// On phones each filter group is one swipeable row (instead of wrapping into
// several rows that push the products below the fold); from md up it wraps.
// The row scrolls the selected option into view so a filter preset from the
// URL (?marca= / ?tipo=) isn't hidden off-screen to the right.
function FilterRow({
  label,
  hint,
  activeKey,
  className = '',
  children,
}: {
  className?: string;
  label: string;
  hint?: string;
  activeKey: string;
  children: ReactNode;
}) {
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
    <div className={`px-4 py-2.5 md:grid md:grid-cols-[7.5rem_1fr] md:items-center md:gap-4 md:px-5 md:py-3 ${className}`}>
      <div className="mb-1.5 flex items-baseline gap-2 md:mb-0 md:flex-col md:gap-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-coffee-600">{label}</p>
        {hint && <p className="hidden text-[11px] text-coffee-400 md:block">{hint}</p>}
      </div>
      <div
        ref={scrollerRef}
        role="group"
        aria-label={label}
        className="scrollbar-none edge-fade relative -mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto overscroll-x-contain px-4 py-0.5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      >
        {children}
      </div>
    </div>
  );
}

function CategoryTile({
  label,
  icon,
  active,
  disabled = false,
  href,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  disabled?: boolean;
  href?: string;
  onClick: () => void;
}) {
  return (
    <Tap
      href={href}
      onClick={onClick}
      pressed={href ? undefined : active}
      disabled={disabled}
      title={disabled ? `${label} — sin productos con estos filtros` : undefined}
      className={`flex h-9 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border pl-2 pr-3.5 text-[13px] transition-[background-color,border-color,color,opacity,transform] duration-200 active:scale-[0.96] disabled:pointer-events-none [&_svg]:h-[18px] [&_svg]:w-[18px] ${
        active
          ? 'border-coffee-900 bg-coffee-900 font-medium text-cream-50'
          : disabled
            ? 'border-cream-200 bg-white text-coffee-700 opacity-35'
            : 'border-cream-200 bg-white text-coffee-800 hover:border-coffee-400'
      }`}
    >
      {icon}
      {label}
    </Tap>
  );
}

function BrandTile({
  label,
  logo,
  active,
  dimmed = false,
  disabled = false,
  href,
  onClick,
}: {
  label: string;
  logo?: string;
  active: boolean;
  dimmed?: boolean;
  disabled?: boolean;
  href?: string;
  onClick: () => void;
}) {
  return (
    <Tap
      href={href}
      onClick={onClick}
      pressed={href ? undefined : active}
      disabled={disabled}
      title={disabled ? `${label} — sin productos con estos filtros` : label}
      ariaLabel={label}
      className={`relative flex h-9 min-w-[72px] shrink-0 snap-start items-center justify-center rounded-full border bg-white px-3.5 transition-[border-color,box-shadow,opacity,transform] duration-200 active:scale-[0.96] disabled:pointer-events-none ${
        active
          ? 'border-coffee-900 shadow-[0_0_0_1px_rgb(var(--color-coffee-900))]'
          : disabled
            ? 'border-cream-200 opacity-35'
            : 'border-cream-200 hover:border-coffee-400'
      }`}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={label}
          loading="lazy"
          decoding="async"
          className={`h-5 max-w-[84px] object-contain transition-[filter,opacity] duration-200 ${
            dimmed || disabled ? 'opacity-60 grayscale' : ''
          }`}
        />
      ) : (
        <span
          className={`whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] ${
            dimmed ? 'text-coffee-400' : 'text-coffee-800'
          }`}
        >
          {label}
        </span>
      )}
      {active && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-coffee-900 text-cream-50"
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
            <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </Tap>
  );
}

function SizeChip({
  label,
  active,
  disabled = false,
  href,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  href?: string;
  onClick: () => void;
}) {
  return (
    <Tap
      href={href}
      onClick={onClick}
      pressed={href ? undefined : active}
      disabled={disabled}
      title={disabled ? `Talla ${label} — sin productos con estos filtros` : `Talla ${label}`}
      ariaLabel={`Talla ${label}`}
      className={`flex h-9 min-w-[2.25rem] shrink-0 snap-start items-center justify-center rounded-full border px-2.5 text-[13px] font-medium tabular-nums transition-[background-color,border-color,color,opacity,transform] duration-200 active:scale-[0.94] disabled:pointer-events-none ${
        active
          ? 'border-coffee-900 bg-coffee-900 text-cream-50'
          : disabled
            ? 'border-dashed border-cream-300 bg-transparent text-coffee-300'
            : 'border-cream-200 bg-white text-coffee-800 hover:border-coffee-400'
      }`}
    >
      {label}
    </Tap>
  );
}

function ActivePill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Quitar filtro ${label}`}
      className="flex h-7 items-center gap-1 rounded-full bg-coffee-900 pl-2.5 pr-1.5 font-medium text-cream-50 transition-transform active:scale-[0.96]"
    >
      {label}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function ViewToggle({ view, onChange }: { view: GridView; onChange: (next: Partial<GridView>) => void }) {
  const btn = (active: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
      active ? 'bg-coffee-900 text-cream-50' : 'text-coffee-400 hover:text-coffee-900'
    }`;
  return (
    <div role="group" aria-label="Vista de productos" className="flex items-center gap-0.5">
      {MOBILE_COLS.map((n) => (
        <button
          key={`m${n}`}
          onClick={() => onChange({ mobile: n })}
          aria-pressed={view.mobile === n}
          aria-label={n === 1 ? 'Ver 1 por fila' : 'Ver 2 por fila'}
          className={`${btn(view.mobile === n)} md:hidden`}
        >
          <GridIcon cols={n} />
        </button>
      ))}
      {DESKTOP_COLS.map((n) => (
        <button
          key={`d${n}`}
          onClick={() => onChange({ desktop: n })}
          aria-pressed={view.desktop === n}
          aria-label={`Ver ${n} por fila`}
          className={`${btn(view.desktop === n)} hidden md:flex`}
        >
          <GridIcon cols={n} />
        </button>
      ))}
    </div>
  );
}

function GridIcon({ cols }: { cols: number }) {
  const gap = 1.5;
  const w = (14 - gap * (cols - 1)) / cols;
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      {Array.from({ length: cols }, (_, i) => (
        <rect key={i} x={i * (w + gap)} y="0" width={w} height="14" rx="1" />
      ))}
    </svg>
  );
}

// Garment icon picked from the category name the admin typed (Spanish or
// English), so new categories get a sensible icon without any setup.
function GarmentIcon({ category }: { category: string }) {
  const c = category.toLowerCase();
  const kind = /cuello redondo|crew|buzo|sweater|su[eé]ter/.test(c)
    ? 'crew'
    : /hoodie|hoody|capota|sudadera con capucha/.test(c)
      ? 'hoodie'
      : /chaqueta|jacket|chamarra|cortavientos|chompa|abrigo|bomber/.test(c)
        ? 'jacket'
        : /camiseta|t-shirt|tshirt|camisa|polo|tee|top/.test(c)
          ? 'tee'
          : /short|bermuda/.test(c)
            ? 'shorts'
            : /jogger|pantal[oó]n|pants|sudadera|cargo|jean/.test(c)
              ? 'pants'
              : /gorra|cap|hat|sombrero|beanie|gorro/.test(c)
                ? 'cap'
                : /media|calcet|sock/.test(c)
                  ? 'sock'
                  : 'tag';
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === 'hoodie' && (
        <>
          <path d="M8 4.8 4.5 6.6 2.6 13.2l2.4 1 1-2.9V21h12V11.3l1 2.9 2.4-1-1.9-6.6L16 4.8" />
          <path d="M8 4.8C8.6 3.1 10.1 2 12 2s3.4 1.1 4 2.8" />
          <path d="M9.4 5.2c.5 1.5 1.4 2.4 2.6 2.4s2.1-.9 2.6-2.4" />
          <path d="M9 15.5h6v3H9z" />
        </>
      )}
      {kind === 'crew' && (
        <>
          <path d="M8.6 3.5 4.5 5.4 2.6 13.2l2.4 1 1-2.9V21h12V11.3l1 2.9 2.4-1-1.9-7.8-4.1-1.9" />
          <path d="M8.6 3.5c.8 1.2 2 1.8 3.4 1.8s2.6-.6 3.4-1.8" />
          <path d="M6 18.8h12" />
        </>
      )}
      {kind === 'jacket' && (
        <>
          <path d="M8.2 3.5 4.5 5.4 2.6 13.2l2.4 1 1-2.9V21h12V11.3l1 2.9 2.4-1-1.9-7.8-3.7-1.9" />
          <path d="M8.2 3.5 12 7l3.8-3.5" />
          <path d="M12 7v14" />
          <path d="M7.6 15h2.4M14 15h2.4" />
        </>
      )}
      {kind === 'tee' && (
        <>
          <path d="M8.6 3.5 3 6.1l1.9 4L7 9.1V21h10V9.1l2.1 1 1.9-4-5.6-2.6" />
          <path d="M8.6 3.5c.8 1.3 2 2 3.4 2s2.6-.7 3.4-2" />
        </>
      )}
      {kind === 'pants' && (
        <>
          <path d="M6.6 3h10.8l1.1 18h-4.6L12 9.6 10.1 21H5.5l1.1-18Z" />
          <path d="M6.5 6h11" />
        </>
      )}
      {kind === 'shorts' && (
        <>
          <path d="M5 5h14l1.2 11.6-5.8 1L12 10.2l-2.4 7.4-5.8-1L5 5Z" />
          <path d="M5 8h14" />
        </>
      )}
      {kind === 'cap' && (
        <>
          <path d="M4 15a8 8 0 0 1 16 0" />
          <path d="M4 15h11.5c2.4 0 4.6.6 6 1.9" />
          <path d="M12 7V5.6" />
        </>
      )}
      {kind === 'sock' && (
        <>
          <path d="M8 2.5h7v9.2l-4.6 6.6a3 3 0 0 1-4.9-3.4L8 12.3V2.5Z" />
          <path d="M8 6h7" />
        </>
      )}
      {kind === 'tag' && (
        <>
          <path d="M11.5 3H5a2 2 0 0 0-2 2v6.5a2 2 0 0 0 .6 1.4l9 9a2 2 0 0 0 2.8 0l6.5-6.5a2 2 0 0 0 0-2.8l-9-9a2 2 0 0 0-1.4-.6Z" />
          <circle cx="8" cy="8" r="1.4" />
        </>
      )}
    </svg>
  );
}

function AllIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

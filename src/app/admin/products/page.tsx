'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { formatCOP } from '@/lib/format';
import { colorToHex, COMMON_COLORS, parseColorImages, parseColorHex, type ColorImages } from '@/lib/colors';
import { isOnSale, discountPercent } from '@/lib/discount';
import SizeChartEditor from '@/components/admin/SizeChartEditor';
import { parseSizeChart, hasSizeChartData, SUGGESTED_SIZE_COLUMNS, type SizeChart } from '@/lib/sizeChart';
import ChipListEditor from '@/components/admin/ChipListEditor';
import MediaUploader from '@/components/admin/MediaUploader';
import ReviewsManager from '@/components/admin/ReviewsManager';
import { variantKey, variantCombos, evenSplitStock, COMMON_SIZES, type VariantStock } from '@/lib/variants';
import { autoBulletize, pasteBulletedText } from '@/lib/textareaBullets';

type Product = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string | null;
  description: string;
  materials: string | null;
  details: string | null;
  careInstructions: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  costCents: number | null;
  images: string[];
  colorImages: ColorImages | null;
  colorHex: Record<string, string> | null;
  sizeChart: unknown;
  videos: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  variants: VariantStock[];
  active: boolean;
  isPromo: boolean;
};

type BrandEntry = { id: string; name: string; logoUrl: string | null; productCount: number };
type CategoryEntry = { id: string; name: string; productCount: number };

const LOW_STOCK_THRESHOLD = 5;

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Only the first color goes into the slug — a product can carry several
// colors, but the slug just needs to disambiguate it from another product
// with the same name, not enumerate every variant.
function autoSlug(name: string, colors: string[]) {
  return slugify(colors[0] ? `${name} ${colors[0]}` : name);
}

// Groups near-duplicate labels that only differ in case or stray whitespace
// (e.g. one product saved with "Fear of God" and another with "FEAR OF
// GOD") so the filter chips show one entry instead of two.
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

type FormState = {
  name: string;
  slug: string;
  brand: string;
  category: string;
  description: string;
  materials: string;
  details: string;
  careInstructions: string;
  price: string;
  compareAtPrice: string;
  cost: string;
  variantStock: Record<string, number>;
  images: string[];
  colorImages: ColorImages;
  colorHex: Record<string, string>;
  sizeChart: SizeChart;
  videos: string[];
  sizes: string[];
  colors: string[];
  active: boolean;
  isPromo: boolean;
};

const emptyForm: FormState = {
  name: '',
  slug: '',
  brand: '',
  category: '',
  description: '',
  materials: '',
  details: '',
  careInstructions: '',
  price: '',
  compareAtPrice: '',
  cost: '',
  variantStock: {},
  images: [],
  colorImages: {},
  colorHex: {},
  sizeChart: { columns: SUGGESTED_SIZE_COLUMNS, rows: {}, note: '' },
  videos: [],
  sizes: [],
  colors: [],
  active: true,
  isPromo: false,
};

// The form works in whole pesos (what an admin actually types and reads);
// priceCents in the API/DB stays in cents for consistency with the rest of
// the codebase (discounts, totals, Wompi amounts) — convert at this boundary.
function toForm(p: Product): FormState {
  // A product saved with colors but whose photos only live in the general
  // gallery (uploaded before the colors were added, or imported) would show
  // every color with zero photos and refuse to save: hand those photos to the
  // first color so they appear — and stay — where the editor looks.
  const colorImages = parseColorImages(p.colorImages);
  if (p.colors.length > 0 && !p.colors.some((c) => colorImages[c]?.length) && p.images.length > 0) {
    colorImages[p.colors[0]] = p.images;
  }
  return {
    name: p.name,
    slug: autoSlug(p.name, p.colors),
    brand: p.brand,
    category: p.category ?? '',
    description: p.description,
    materials: p.materials ?? '',
    details: p.details ?? '',
    careInstructions: p.careInstructions ?? '',
    price: String(p.priceCents / 100),
    compareAtPrice: p.compareAtPriceCents ? String(p.compareAtPriceCents / 100) : '',
    cost: p.costCents != null ? String(p.costCents / 100) : '',
    variantStock:
      p.variants.length > 0
        ? Object.fromEntries(p.variants.map((v) => [variantKey(v.size, v.color), v.stock]))
        : evenSplitStock(p.stock, p.sizes, p.colors),
    images: p.images,
    colorImages,
    colorHex: parseColorHex(p.colorHex),
    sizeChart: parseSizeChart(p.sizeChart) ?? { columns: SUGGESTED_SIZE_COLUMNS, rows: {}, note: '' },
    videos: p.videos,
    sizes: p.sizes,
    colors: p.colors,
    active: p.active,
    isPromo: p.isPromo,
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brandList, setBrandList] = useState<BrandEntry[]>([]);
  const [showBrandManager, setShowBrandManager] = useState(false);
  const [categoryList, setCategoryList] = useState<CategoryEntry[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'low'>('all');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'name' | 'description' | 'brand' | 'price' | 'images' | 'sizes', string>>>({});
  // Snapshot of the form when the editor opened, to tell real edits apart.
  const [initialFormJson, setInitialFormJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    updated: number;
    notFound: string[];
    errors: { row: number; name: string; message: string }[];
  } | null>(null);

  const load = async () => {
    const res = await fetch('/api/products');
    if (res.ok) setProducts(await res.json());
  };

  const loadBrands = async () => {
    const res = await fetch('/api/admin/brands');
    if (res.ok) setBrandList(await res.json());
  };

  const loadCategories = async () => {
    const res = await fetch('/api/admin/categories');
    if (res.ok) setCategoryList(await res.json());
  };

  useEffect(() => {
    load();
    loadBrands();
    loadCategories();
  }, []);

  const deleteBrand = async (b: BrandEntry) => {
    if (!confirm(`¿Eliminar la marca "${b.name}"?`)) return;
    const res = await fetch(`/api/admin/brands/${b.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.error ?? 'No se pudo eliminar la marca');
      return;
    }
    loadBrands();
  };

  const [uploadingLogoFor, setUploadingLogoFor] = useState<string | null>(null);

  const uploadBrandLogo = async (b: BrandEntry, file: File) => {
    setUploadingLogoFor(b.id);
    try {
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const uploadData = await uploadRes.json().catch(() => null);
      if (!uploadRes.ok || !uploadData?.url) {
        alert(uploadData?.error ?? 'No se pudo subir el logo');
        return;
      }
      const patchRes = await fetch(`/api/admin/brands/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: uploadData.url }),
      });
      if (!patchRes.ok) {
        alert('No se pudo guardar el logo');
        return;
      }
      loadBrands();
    } finally {
      setUploadingLogoFor(null);
    }
  };

  const removeBrandLogo = async (b: BrandEntry) => {
    await fetch(`/api/admin/brands/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logoUrl: null }),
    });
    loadBrands();
  };

  const deleteCategory = async (c: CategoryEntry) => {
    if (!confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
    const res = await fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.error ?? 'No se pudo eliminar la categoría');
      return;
    }
    loadCategories();
  };

  const brands = useMemo(() => dedupeLabels(products.map((p) => p.brand)), [products]);
  const categories = useMemo(() => dedupeLabels(products.map((p) => p.category)), [products]);

  // Managed Brand rows saved before the case-insensitive upsert existed can
  // still collide once displayed uppercase (e.g. "Fear of God" and "FEAR OF
  // GOD" read identically as chips) — group those so the UI can offer a
  // one-click fix instead of leaving two rows that look like one.
  const duplicateBrandGroups = useMemo(() => {
    const groups = new Map<string, BrandEntry[]>();
    for (const b of brandList) {
      const key = b.name.trim().toLowerCase();
      groups.set(key, [...(groups.get(key) ?? []), b]);
    }
    return Array.from(groups.values()).filter((g) => g.length > 1);
  }, [brandList]);

  const mergeBrandGroup = async (group: BrandEntry[]) => {
    const survivor = [...group].sort((a, b) => b.productCount - a.productCount)[0];
    const mergeIds = group.filter((b) => b.id !== survivor.id).map((b) => b.id);
    const res = await fetch('/api/admin/brands/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keepId: survivor.id, mergeIds }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.error ?? 'No se pudo unificar la marca');
      return;
    }
    loadBrands();
    load();
  };

  const totalFormStock = useMemo(
    () =>
      variantCombos(form.sizes, form.colors).reduce(
        (sum, { size, color }) => sum + (form.variantStock[variantKey(size, color)] ?? 0),
        0
      ),
    [form.sizes, form.colors, form.variantStock]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (brandFilter && p.brand.trim().toLowerCase() !== brandFilter.toLowerCase()) return false;
      if (categoryFilter && p.category?.trim().toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q)) return false;
      if (statusFilter === 'active' && !p.active) return false;
      if (statusFilter === 'inactive' && p.active) return false;
      if (statusFilter === 'low' && !(p.active && p.stock <= LOW_STOCK_THRESHOLD)) return false;
      return true;
    });
  }, [products, query, brandFilter, categoryFilter, statusFilter]);

  const openEditor = (id: string | 'new', next: FormState) => {
    setEditingId(id);
    setForm(next);
    setInitialFormJson(JSON.stringify(next));
    setError('');
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const startCreate = () => openEditor('new', emptyForm);
  const startEdit = (p: Product) => openEditor(p.id, toForm(p));

  const closeEditor = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setFieldErrors({});
  };
  // Leaving with unsaved edits asks first, instead of silently losing them.
  const cancelEdit = () => {
    if (editingId !== null && JSON.stringify(form) !== initialFormJson && !confirm('Tienes cambios sin guardar. ¿Salir sin guardar?')) return;
    closeEditor();
  };

  useEffect(() => {
    if (editingId === null || JSON.stringify(form) === initialFormJson) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editingId, form, initialFormJson]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // With colors, there's no general gallery to edit anymore — the
    // product's main `images` (used wherever there's no color context yet,
    // e.g. the cart line, search results, the admin list) is derived from
    // the first color's photos, falling back to any other color's if the
    // first one hasn't gotten its photos yet.
    const effectiveImages =
      form.colors.length > 0
        ? form.colorImages[form.colors[0]]?.length
          ? form.colorImages[form.colors[0]]
          : form.colors.flatMap((c) => form.colorImages[c] ?? [])
        : form.images;
    const errors: typeof fieldErrors = {};
    if (!form.name.trim()) errors.name = 'Escribe el nombre del producto.';
    if (!form.description.trim()) errors.description = 'Agrega una descripción corta.';
    if (!form.brand.trim()) errors.brand = 'Elige o escribe una marca.';
    if (!(Number(form.price) > 0)) errors.price = 'Ingresa un precio mayor a 0.';
    if (effectiveImages.length === 0)
      errors.images = form.colors.length > 0 ? 'Sube al menos una foto para alguno de los colores.' : 'Sube al menos una foto.';
    if (form.sizes.length === 0) errors.sizes = 'Agrega al menos una talla.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSaving(true);
    // The slug is always auto-generated now, so two products that land on
    // the same name+color need a disambiguating suffix instead of a 500
    // from the DB's unique constraint.
    const takenSlugs = new Set(products.filter((p) => p.id !== editingId).map((p) => p.slug));
    let slug = form.slug;
    for (let n = 2; takenSlugs.has(slug); n++) slug = `${form.slug}-${n}`;
    const payload = {
      name: form.name,
      slug,
      brand: form.brand,
      category: form.category || null,
      description: form.description,
      materials: form.materials || null,
      details: form.details || null,
      careInstructions: form.careInstructions || null,
      priceCents: Math.round(Number(form.price) * 100),
      compareAtPriceCents: form.compareAtPrice ? Math.round(Number(form.compareAtPrice) * 100) : null,
      costCents: form.cost ? Math.round(Number(form.cost) * 100) : null,
      // Stock lives per size+color combo now — send the full matrix for
      // the product's current sizes/colors; the API sums it into the
      // product's cached total stock.
      variants: variantCombos(form.sizes, form.colors).map(({ size, color }) => ({
        size,
        color,
        stock: form.variantStock[variantKey(size, color)] ?? 0,
      })),
      images: effectiveImages,
      // Drop any leftover entry for a color that's since been removed from
      // the chip list, so deleting a color also clears its photo set.
      colorImages: Object.fromEntries(
        Object.entries(form.colorImages).filter(([color, urls]) => form.colors.includes(color) && urls.length > 0)
      ),
      // Same cleanup as colorImages: drop overrides for colors no longer
      // on the product, so the stored map never outlives the chip it tints.
      colorHex: Object.fromEntries(
        Object.entries(form.colorHex).filter(([color]) => form.colors.includes(color))
      ),
      // Only rows for the product's current sizes, padded to the column
      // count; an all-empty chart is cleared so the PDP hides the link.
      sizeChart: hasSizeChartData(form.sizeChart, form.sizes)
        ? {
            columns: form.sizeChart.columns.map((c) => c.trim()),
            rows: Object.fromEntries(
              form.sizes.map((size) => [
                size,
                form.sizeChart.columns.map((_, i) => (form.sizeChart.rows[size]?.[i] ?? '').trim()),
              ])
            ),
            ...(form.sizeChart.note?.trim() ? { note: form.sizeChart.note.trim() } : {}),
          }
        : null,
      videos: form.videos,
      sizes: form.sizes,
      colors: form.colors,
      isPromo: form.isPromo,
      // Create has no "active" field (new products start visible); edits send it.
      ...(editingId === 'new' ? {} : { active: form.active }),
    };
    const res =
      editingId === 'new'
        ? await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/products/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
    if (res.ok && editingId === 'new' && !form.active) {
      const created = await res.clone().json().catch(() => null);
      if (created?.id) {
        await fetch(`/api/products/${created.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: false }),
        });
      }
    }
    setSaving(false);
    if (!res.ok) {
      setError('No se pudo guardar el producto. Revisa los datos e intenta de nuevo.');
      return;
    }
    // Register the brand (and category, if set) even if new, so each stays
    // in its managed list even after this product is later deleted or
    // reassigned.
    await fetch('/api/admin/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.brand }),
    });
    if (form.category) {
      await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.category }),
      });
    }
    closeEditor();
    load();
    loadBrands();
    loadCategories();
  };

  const toggleActive = async (p: Product) => {
    await fetch(`/api/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !p.active }),
    });
    load();
  };

  const togglePromo = async (p: Product) => {
    await fetch(`/api/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPromo: !p.isPromo }),
    });
    load();
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/admin/import', { method: 'POST', body });
    setImporting(false);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      alert(err?.error ?? 'No se pudo importar el archivo');
      return;
    }
    setImportResult(await res.json());
    load();
  };

  const duplicate = async (p: Product) => {
    const res = await fetch(`/api/products/${p.id}/duplicate`, { method: 'POST' });
    if (!res.ok) return;
    const copy: Product = await res.json();
    await load();
    startEdit(copy);
  };

  const deleteProduct = async (p: Product) => {
    if (!confirm(`¿Eliminar "${p.name}" de forma permanente? Esta acción no se puede deshacer.`)) {
      return;
    }
    const res = await fetch(`/api/products/${p.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.error ?? 'No se pudo eliminar el producto');
      return;
    }
    if (editingId === p.id) closeEditor();
    load();
  };

  const editingProduct = editingId && editingId !== 'new' ? products.find((p) => p.id === editingId) ?? null : null;
  const isDirty = editingId !== null && JSON.stringify(form) !== initialFormJson;
  const priceNum = Number(form.price);
  const compareNum = Number(form.compareAtPrice);
  const costNum = Number(form.cost);
  const errorCount = Object.keys(fieldErrors).length;

  const statusCounts = {
    all: products.length,
    active: products.filter((p) => p.active).length,
    inactive: products.filter((p) => !p.active).length,
    low: products.filter((p) => p.active && p.stock <= LOW_STOCK_THRESHOLD).length,
  };

  // ───────────────────────────── Editor view ─────────────────────────────
  if (editingId !== null) {
    return (
      <form onSubmit={handleSubmit} noValidate className="pb-24">
        {/* Sticky action bar: back, title, save — always reachable on long forms */}
        <div className="sticky top-[6.25rem] z-20 -mx-4 mb-6 border-b border-cream-200 bg-cream-50/95 px-4 py-3 backdrop-blur md:top-0 md:-mx-8 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={cancelEdit}
              aria-label="Volver a productos"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cream-200 bg-white text-coffee-700 transition-colors hover:border-coffee-400 hover:text-coffee-900"
            >
              <ChevronLeftIcon />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.14em] text-coffee-500">
                {editingId === 'new' ? 'Nuevo producto' : 'Editar producto'}
              </p>
              <h1 className="truncate text-lg font-semibold tracking-tightest text-coffee-900 md:text-xl">
                {form.name.trim() || 'Sin nombre'}
              </h1>
            </div>
            {isDirty && !saving && (
              <span className="hidden items-center gap-1.5 text-xs text-amber-700 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                Cambios sin guardar
              </span>
            )}
            {editingProduct && (
              <a
                href={`/productos/${editingProduct.slug}`}
                target="_blank"
                rel="noreferrer"
                className="hidden rounded-full border border-cream-200 bg-white px-4 py-2 text-sm text-coffee-700 transition-colors hover:border-coffee-400 hover:text-coffee-900 lg:block"
              >
                Ver en tienda
              </a>
            )}
            <button
              type="button"
              onClick={cancelEdit}
              className="hidden rounded-full px-4 py-2 text-sm text-coffee-600 transition-colors hover:text-coffee-900 sm:block"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-coffee-900 px-5 py-2 text-sm font-medium text-cream-50 transition-[background-color,transform] hover:bg-coffee-800 active:scale-[0.97] disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
          {(error || errorCount > 0) && (
            <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error || `Revisa ${errorCount === 1 ? 'el campo marcado' : `los ${errorCount} campos marcados`} en rojo.`}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* ── Main column ── */}
          <div className="min-w-0 space-y-6">
            <Section title="Información básica" description="Lo que ve el cliente primero.">
              <div className="space-y-4">
                <FormField label="Nombre del producto" error={fieldErrors.name}>
                  <input
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((f) => ({ ...f, name, slug: autoSlug(name, f.colors) }));
                    }}
                    placeholder="Ej: Hoodie Box Logo Oversized"
                    className={inputClass(fieldErrors.name)}
                  />
                  {form.slug && (
                    <p className="mt-1.5 truncate text-[11px] text-coffee-400">
                      URL: wearafra.com/productos/<span className="text-coffee-600">{form.slug}</span>
                    </p>
                  )}
                </FormField>
                <FormField label="Descripción" hint="Una o dos frases. Escribe '-' al inicio de una línea para hacer una lista." error={fieldErrors.description}>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: autoBulletize(e.target.value, e.target.selectionStart) })}
                    onPaste={(e) => pasteBulletedText(e, form.description, (v) => setForm((f) => ({ ...f, description: v })))}
                    rows={3}
                    placeholder="Hoodie de felpa pesada con logo bordado…"
                    className={inputClass(fieldErrors.description)}
                  />
                </FormField>
              </div>
            </Section>

            <Section
              title="Fotos y videos"
              description={
                form.colors.length > 0
                  ? 'Cada color tiene sus propias fotos. La primera foto de cada color es la principal; arrastra para reordenar.'
                  : 'La primera foto es la principal. Arrastra para reordenar.'
              }
              error={fieldErrors.images}
            >
              {form.colors.length === 0 ? (
                <MediaUploader label="" kind="image" items={form.images} onChange={(images) => setForm({ ...form, images })} />
              ) : (
                <div className="space-y-5">
                  {form.colors.map((color) => (
                    <div key={color} className="rounded-xl border border-cream-200 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-cream-300"
                          style={{ backgroundColor: colorToHex(color, form.colorHex) }}
                        />
                        <span className="text-sm font-medium text-coffee-800">{color}</span>
                        <span className="text-xs text-coffee-400">
                          {(form.colorImages[color] ?? []).length} foto{(form.colorImages[color] ?? []).length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <MediaUploader
                        label=""
                        kind="image"
                        items={form.colorImages[color] ?? []}
                        onChange={(urls) => setForm({ ...form, colorImages: { ...form.colorImages, [color]: urls } })}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 border-t border-cream-200 pt-4">
                <MediaUploader label="Videos (opcional)" kind="video" items={form.videos} onChange={(videos) => setForm({ ...form, videos })} />
              </div>
            </Section>

            <Section title="Tallas, colores e inventario" description="Define qué variantes vendes y cuántas unidades tienes de cada una." error={fieldErrors.sizes}>
              <div className="space-y-5">
                <ChipListEditor label="Tallas" items={form.sizes} onChange={(sizes) => setForm({ ...form, sizes })} suggestions={COMMON_SIZES} />
                <ChipListEditor
                  label="Colores (opcional)"
                  items={form.colors}
                  onChange={(colors) => setForm((f) => ({ ...f, colors, slug: autoSlug(f.name, colors) }))}
                  suggestions={COMMON_COLORS}
                  swatch={(c) => colorToHex(c, form.colorHex)}
                  onSwatchChange={(c, hex) => setForm((f) => ({ ...f, colorHex: { ...f.colorHex, [c]: hex } }))}
                />
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium text-coffee-700">Unidades disponibles</p>
                    <p className="text-xs text-coffee-500">
                      Total: <span className="font-semibold tabular-nums text-coffee-900">{totalFormStock}</span>
                    </p>
                  </div>
                  {form.sizes.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-cream-300 px-3 py-4 text-center text-xs text-coffee-400">
                      Agrega al menos una talla para definir el inventario.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-cream-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-cream-200 bg-cream-50">
                            <th className="px-3 py-2 text-left text-xs font-medium text-coffee-600">Talla</th>
                            {(form.colors.length > 0 ? form.colors : ['Unidades']).map((color) => (
                              <th key={color} className="px-3 py-2 text-left text-xs font-medium text-coffee-600">
                                <span className="flex items-center gap-1.5">
                                  {form.colors.length > 0 && (
                                    <span className="h-2.5 w-2.5 rounded-full border border-cream-300" style={{ backgroundColor: colorToHex(color, form.colorHex) }} />
                                  )}
                                  {color}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {form.sizes.map((size) => (
                            <tr key={size} className="border-b border-cream-100 last:border-0">
                              <td className="px-3 py-2 text-sm font-medium text-coffee-800">{size}</td>
                              {(form.colors.length > 0 ? form.colors : [null]).map((color) => {
                                const key = variantKey(size, color);
                                const value = form.variantStock[key] ?? 0;
                                return (
                                  <td key={key} className="px-2 py-1.5">
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      min="0"
                                      aria-label={`Unidades talla ${size}${color ? ` color ${color}` : ''}`}
                                      value={value}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) =>
                                        setForm({
                                          ...form,
                                          variantStock: { ...form.variantStock, [key]: Math.max(0, Number(e.target.value)) },
                                        })
                                      }
                                      className={`w-20 rounded-lg border px-2 py-1.5 text-sm tabular-nums focus:border-coffee-700 focus:outline-none ${
                                        value === 0 ? 'border-cream-200 text-coffee-400' : 'border-cream-200 text-coffee-900'
                                      }`}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </Section>

            <Section
              title="Guía de tallas"
              description="Opcional. Si la dejas vacía se usa la guía general de la tienda o una genérica según el tipo de prenda."
              collapsible
              defaultOpen={hasSizeChartData(form.sizeChart, form.sizes)}
            >
              <SizeChartEditor sizes={form.sizes} value={form.sizeChart} onChange={(sizeChart) => setForm((f) => ({ ...f, sizeChart }))} title="" hint="" />
            </Section>

            <Section
              title="Detalles de la prenda"
              description="Opcional. Se muestran en la sección «Sobre la prenda». Un punto por línea."
              collapsible
              defaultOpen={Boolean(form.materials || form.details || form.careInstructions)}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField label="Materiales">
                  <textarea
                    value={form.materials}
                    onChange={(e) => setForm({ ...form, materials: autoBulletize(e.target.value, e.target.selectionStart) })}
                    onPaste={(e) => pasteBulletedText(e, form.materials, (v) => setForm((f) => ({ ...f, materials: v })))}
                    placeholder="100% algodón, felpa francesa 400 g"
                    rows={4}
                    className={inputClass()}
                  />
                </FormField>
                <FormField label="Detalles">
                  <textarea
                    value={form.details}
                    onChange={(e) => setForm({ ...form, details: autoBulletize(e.target.value, e.target.selectionStart) })}
                    onPaste={(e) => pasteBulletedText(e, form.details, (v) => setForm((f) => ({ ...f, details: v })))}
                    placeholder={'Corte oversized\nBolsillo canguro\nEtiqueta bordada'}
                    rows={4}
                    className={inputClass()}
                  />
                </FormField>
                <FormField label="Cuidados y lavado">
                  <textarea
                    value={form.careInstructions}
                    onChange={(e) => setForm({ ...form, careInstructions: autoBulletize(e.target.value, e.target.selectionStart) })}
                    onPaste={(e) => pasteBulletedText(e, form.careInstructions, (v) => setForm((f) => ({ ...f, careInstructions: v })))}
                    placeholder="Lavar en frío, del revés, sin secadora"
                    rows={4}
                    className={inputClass()}
                  />
                </FormField>
              </div>
            </Section>

            {editingProduct && (
              <Section title="Reseñas" description="Opiniones que aparecen en la página del producto." collapsible>
                <ReviewsManager productId={editingProduct.id} />
              </Section>
            )}
          </div>

          {/* ── Sidebar: status, price, organization ── */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Section title="Estado">
              <div className="space-y-3">
                <Switch
                  checked={form.active}
                  onChange={(active) => setForm({ ...form, active })}
                  label="Visible en la tienda"
                  hint={form.active ? 'Los clientes pueden verlo y comprarlo.' : 'Oculto: nadie lo ve en la tienda.'}
                />
                <Switch
                  checked={form.isPromo}
                  onChange={(isPromo) => setForm({ ...form, isPromo })}
                  label="Mostrar en Promos"
                  hint="Aparece en /promos y en la sección de promociones del inicio."
                />
              </div>
            </Section>

            <Section title="Precio">
              <div className="space-y-4">
                <FormField label="Precio de venta" error={fieldErrors.price}>
                  <MoneyInput value={form.price} onChange={(price) => setForm({ ...form, price })} placeholder="450000" invalid={Boolean(fieldErrors.price)} />
                </FormField>
                <FormField label="Precio antes (opcional)" hint="Se muestra tachado junto al precio.">
                  <MoneyInput value={form.compareAtPrice} onChange={(compareAtPrice) => setForm({ ...form, compareAtPrice })} placeholder="560000" />
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {[10, 20, 30, 40, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        disabled={!form.price}
                        onClick={() => setForm({ ...form, compareAtPrice: String(Math.round(priceNum / (1 - pct / 100))) })}
                        className="rounded-full border border-cream-300 bg-white px-2.5 py-1 text-[11px] text-coffee-700 transition-colors hover:border-coffee-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        -{pct}%
                      </button>
                    ))}
                    {form.compareAtPrice && (
                      <button type="button" onClick={() => setForm({ ...form, compareAtPrice: '' })} className="px-1 text-[11px] text-coffee-500 underline hover:text-coffee-800">
                        Quitar
                      </button>
                    )}
                  </div>
                  {priceNum > 0 && compareNum > priceNum && (
                    <p className="mt-2 text-xs font-medium text-red-700">
                      Descuento de {discountPercent(Math.round(priceNum * 100), Math.round(compareNum * 100))}%
                    </p>
                  )}
                </FormField>
                <FormField label="Costo (solo interno)" hint="No se muestra al cliente.">
                  <MoneyInput value={form.cost} onChange={(cost) => setForm({ ...form, cost })} placeholder="180000" />
                  {form.cost && priceNum > 0 && (
                    <p className={`mt-1.5 text-xs ${priceNum - costNum >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      Ganancia: {formatCOP(Math.round((priceNum - costNum) * 100))} ({Math.round(((priceNum - costNum) / priceNum) * 100)}%)
                    </p>
                  )}
                </FormField>
              </div>
            </Section>

            <Section title="Organización">
              <div className="space-y-4">
                <FormField label="Marca" error={fieldErrors.brand}>
                  <input
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    list="brand-options"
                    placeholder="Elige o escribe una marca"
                    className={inputClass(fieldErrors.brand)}
                  />
                  <datalist id="brand-options">
                    {brandList.map((b) => (
                      <option key={b.id} value={b.name} />
                    ))}
                  </datalist>
                </FormField>
                <FormField label="Tipo de prenda" hint="Define el ícono del filtro y la guía de tallas genérica.">
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    list="category-options"
                    placeholder="Ej: Hoodie, Camiseta, Pantalón"
                    className={inputClass()}
                  />
                  <datalist id="category-options">
                    {categoryList.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </FormField>
              </div>
            </Section>

            {editingProduct && (
              <button
                type="button"
                onClick={() => deleteProduct(editingProduct)}
                className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-700 transition-colors hover:bg-red-50"
              >
                Eliminar producto
              </button>
            )}
          </div>
        </div>
      </form>
    );
  }

  // ───────────────────────────── List view ─────────────────────────────
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900">Productos</h1>
          <p className="mt-1 text-sm text-coffee-500">
            {statusCounts.active} activo{statusCounts.active === 1 ? '' : 's'} · {statusCounts.inactive} oculto{statusCounts.inactive === 1 ? '' : 's'}
            {statusCounts.low > 0 && <span className="text-amber-700"> · {statusCounts.low} con stock bajo</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Menu label="Marcas y categorías">
            <MenuItem onClick={() => { setShowBrandManager((v) => !v); setShowCategoryManager(false); }}>Gestionar marcas</MenuItem>
            <MenuItem onClick={() => { setShowCategoryManager((v) => !v); setShowBrandManager(false); }}>Gestionar categorías</MenuItem>
          </Menu>
          <Menu label={importing ? 'Importando…' : 'Excel'}>
            <MenuItem href="/api/admin/export">Exportar a Excel</MenuItem>
            <label className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-coffee-800 hover:bg-cream-100">
              Importar desde Excel
              <input
                type="file"
                accept=".xlsx"
                disabled={importing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) handleImportFile(file);
                }}
                className="hidden"
              />
            </label>
          </Menu>
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 rounded-full bg-coffee-900 px-4 py-2 text-sm font-medium text-cream-50 transition-[background-color,transform] hover:bg-coffee-800 active:scale-[0.97]"
          >
            <span aria-hidden="true" className="text-base leading-none">+</span>
            Nuevo producto
          </button>
        </div>
      </div>

      {showBrandManager && (
        <div className="mb-6 rounded-2xl border border-cream-200 bg-white p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-coffee-900">Marcas ({brandList.length})</p>
            <button onClick={() => setShowBrandManager(false)} className="text-sm text-coffee-500 hover:text-coffee-900">Cerrar</button>
          </div>

          {duplicateBrandGroups.length > 0 && (
            <div className="mb-4 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-900">
                Hay marcas que parecen duplicadas (mismo nombre, distinta mayúscula/espacio):
              </p>
              {duplicateBrandGroups.map((group) => (
                <div key={group.map((b) => b.id).join('-')} className="flex flex-wrap items-center gap-2 text-xs text-amber-800">
                  <span>{group.map((b) => `"${b.name}" (${b.productCount})`).join('  +  ')}</span>
                  <button
                    type="button"
                    onClick={() => mergeBrandGroup(group)}
                    className="rounded-full bg-amber-900 px-3 py-1 text-[11px] font-medium text-cream-50 hover:bg-amber-800"
                  >
                    Unificar
                  </button>
                </div>
              ))}
            </div>
          )}

          {brandList.length === 0 ? (
            <p className="text-sm text-coffee-500">Aún no hay marcas registradas. Se crean solas al guardar un producto.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {brandList.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-xl border border-cream-200 p-2.5">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-cream-200 bg-cream-50">
                    {b.logoUrl ? (
                      <Image src={b.logoUrl} alt={b.name} fill className="object-contain p-1" sizes="40px" unoptimized />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[9px] text-coffee-300">Sin logo</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-coffee-900">{b.name}</p>
                    <p className="text-xs text-coffee-400">
                      {b.productCount} producto{b.productCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <label className="shrink-0 cursor-pointer text-xs font-medium text-coffee-600 underline decoration-cream-300 underline-offset-2 hover:text-coffee-900">
                    {uploadingLogoFor === b.id ? 'Subiendo…' : b.logoUrl ? 'Cambiar logo' : 'Subir logo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingLogoFor === b.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) uploadBrandLogo(b, file);
                      }}
                    />
                  </label>
                  {b.logoUrl && (
                    <button type="button" onClick={() => removeBrandLogo(b)} className="shrink-0 text-xs text-coffee-400 hover:text-red-600">
                      Quitar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteBrand(b)}
                    disabled={b.productCount > 0}
                    title={b.productCount > 0 ? 'En uso: no se puede eliminar' : 'Eliminar marca'}
                    aria-label={`Eliminar marca ${b.name}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-coffee-400 hover:bg-cream-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-coffee-400"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCategoryManager && (
        <div className="mb-6 rounded-2xl border border-cream-200 bg-white p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-coffee-900">Categorías ({categoryList.length})</p>
            <button onClick={() => setShowCategoryManager(false)} className="text-sm text-coffee-500 hover:text-coffee-900">Cerrar</button>
          </div>
          {categoryList.length === 0 ? (
            <p className="text-sm text-coffee-500">Aún no hay categorías. Se crean solas al guardar un producto con tipo de prenda.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {categoryList.map((c) => (
                <span key={c.id} className="flex items-center gap-1.5 rounded-full border border-cream-200 py-1.5 pl-3 pr-1.5 text-xs text-coffee-700">
                  {c.name}
                  <span className="text-coffee-400">({c.productCount})</span>
                  <button
                    type="button"
                    onClick={() => deleteCategory(c)}
                    disabled={c.productCount > 0}
                    title={c.productCount > 0 ? 'En uso: no se puede eliminar' : 'Eliminar categoría'}
                    aria-label={`Eliminar categoría ${c.name}`}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-coffee-400 hover:bg-cream-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-coffee-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {importResult && (
        <div className="mb-6 rounded-2xl border border-cream-200 bg-white p-4 text-sm">
          <div className="flex items-center justify-between">
            <p className="font-medium text-coffee-900">
              Importación completa: {importResult.updated} producto{importResult.updated === 1 ? '' : 's'} actualizado
              {importResult.updated === 1 ? '' : 's'}.
            </p>
            <button onClick={() => setImportResult(null)} className="text-coffee-400 hover:text-coffee-700">
              Cerrar
            </button>
          </div>
          {importResult.notFound.length > 0 && (
            <p className="mt-2 text-amber-800">
              No se encontraron {importResult.notFound.length}: {importResult.notFound.join(', ')}
            </p>
          )}
          {importResult.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-red-700">
              {importResult.errors.map((e, i) => (
                <li key={i}>
                  Fila {e.row} ({e.name}): {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Toolbar: search, status tabs, brand/type selects */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-coffee-400">
              <SearchIcon />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o marca…"
              className="w-full rounded-xl border border-cream-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-coffee-700 focus:outline-none focus:ring-2 focus:ring-coffee-900/10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={brandFilter ?? ''}
              onChange={(e) => setBrandFilter(e.target.value || null)}
              aria-label="Filtrar por marca"
              className="min-w-0 flex-1 rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-coffee-800 focus:border-coffee-700 focus:outline-none md:w-44 md:flex-none"
            >
              <option value="">Todas las marcas</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select
              value={categoryFilter ?? ''}
              onChange={(e) => setCategoryFilter(e.target.value || null)}
              aria-label="Filtrar por tipo de prenda"
              className="min-w-0 flex-1 rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-sm text-coffee-800 focus:border-coffee-700 focus:outline-none md:w-44 md:flex-none"
            >
              <option value="">Todos los tipos</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Estado">
          {([
            ['all', 'Todos', statusCounts.all],
            ['active', 'Activos', statusCounts.active],
            ['inactive', 'Ocultos', statusCounts.inactive],
            ['low', 'Stock bajo', statusCounts.low],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              role="tab"
              aria-selected={statusFilter === key}
              onClick={() => setStatusFilter(key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === key ? 'bg-coffee-900 text-cream-50' : 'border border-cream-200 bg-white text-coffee-700 hover:border-coffee-400'
              }`}
            >
              {label}
              <span className={statusFilter === key ? 'text-cream-50/70' : 'text-coffee-400'}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white">
        <div className="hidden grid-cols-[minmax(0,1fr)_8rem_7rem_6rem_7.5rem] items-center gap-4 border-b border-cream-200 bg-cream-50 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-coffee-500 md:grid">
          <span>Producto</span>
          <span>Precio</span>
          <span>Stock</span>
          <span>Visible</span>
          <span className="sr-only">Acciones</span>
        </div>

        {filtered.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm text-coffee-600">
              {products.length === 0 ? 'Aún no tienes productos.' : 'Ningún producto coincide con la búsqueda.'}
            </p>
            {products.length === 0 && (
              <button onClick={startCreate} className="mt-4 rounded-full bg-coffee-900 px-5 py-2 text-sm font-medium text-cream-50">
                Crear el primero
              </button>
            )}
          </div>
        )}

        <ul className="divide-y divide-cream-100">
          {filtered.map((p) => {
            const onSale = isOnSale(p.priceCents, p.compareAtPriceCents);
            const lowStock = p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD;
            return (
              <li
                key={p.id}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-cream-50/70 md:grid-cols-[minmax(0,1fr)_8rem_7rem_6rem_7.5rem] md:gap-4"
              >
                <button type="button" onClick={() => startEdit(p)} className="col-span-2 flex min-w-0 items-center gap-3 text-left md:col-span-1">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-cream-100">
                    {p.images[0] ? (
                      <AdminThumb src={p.images[0]} alt={p.name} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-coffee-300">
                        <NoImageIcon />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-coffee-900">{p.name}</p>
                    <p className="truncate text-xs text-coffee-500">
                      {p.brand}
                      {p.category ? ` · ${p.category}` : ''}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {p.colors.map((c) => (
                        <span
                          key={c}
                          title={c}
                          className="h-3 w-3 rounded-full border border-cream-300"
                          style={{ backgroundColor: colorToHex(c, parseColorHex(p.colorHex)) }}
                        />
                      ))}
                      {onSale && (
                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                          -{discountPercent(p.priceCents, p.compareAtPriceCents as number)}%
                        </span>
                      )}
                      {p.isPromo && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">Promo</span>
                      )}
                    </div>
                  </div>
                </button>

                <div className="col-start-2 row-start-2 flex items-baseline gap-3 text-sm md:col-start-auto md:row-start-auto md:block">
                  <p className="font-medium tabular-nums text-coffee-900">{formatCOP(p.priceCents)}</p>
                  {onSale && <p className="text-xs tabular-nums text-coffee-400 line-through">{formatCOP(p.compareAtPriceCents as number)}</p>}
                  <p className="md:hidden">
                    <StockBadge stock={p.stock} low={lowStock} />
                  </p>
                </div>

                <div className="hidden md:block">
                  <StockBadge stock={p.stock} low={lowStock} />
                </div>

                <div className="col-start-3 row-start-1 md:col-start-auto md:row-start-auto">
                  <Switch checked={p.active} onChange={() => toggleActive(p)} label={p.active ? 'Visible' : 'Oculto'} compact />
                </div>

                <div className="col-start-3 row-start-2 flex items-center justify-end gap-1 md:col-start-auto md:row-start-auto">
                  <button
                    onClick={() => startEdit(p)}
                    className="rounded-full border border-cream-200 px-3.5 py-1.5 text-xs font-medium text-coffee-800 transition-colors hover:border-coffee-600"
                  >
                    Editar
                  </button>
                  <Menu label="Más acciones" icon>
                    <MenuItem onClick={() => duplicate(p)}>Duplicar</MenuItem>
                    <MenuItem onClick={() => togglePromo(p)}>{p.isPromo ? 'Quitar de Promos' : 'Agregar a Promos'}</MenuItem>
                    <MenuItem href={`/productos/${p.slug}`} external>Ver en tienda</MenuItem>
                    <MenuItem onClick={() => deleteProduct(p)} danger>Eliminar</MenuItem>
                  </Menu>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-3 text-xs text-coffee-500">
        Mostrando {filtered.length} de {products.length} producto{products.length === 1 ? '' : 's'}
      </p>
    </div>
  );
}

const inputClass = (error?: string) =>
  `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-coffee-900 placeholder:text-coffee-300 transition-[border-color,box-shadow] focus:outline-none focus:ring-2 ${
    error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : 'border-cream-200 focus:border-coffee-700 focus:ring-coffee-900/10'
  }`;

function Section({
  title,
  description,
  error,
  collapsible = false,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  error?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const header = (
    <div className="min-w-0">
      <h2 className="text-sm font-semibold text-coffee-900">{title}</h2>
      {description && <p className="mt-0.5 text-xs leading-relaxed text-coffee-500">{description}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
  const shell = `rounded-2xl border bg-white ${error ? 'border-red-300' : 'border-cream-200'}`;
  if (collapsible) {
    return (
      <details open={defaultOpen} className={`group ${shell}`}>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-4 md:p-5 [&::-webkit-details-marker]:hidden">
          {header}
          <span className="mt-0.5 shrink-0 text-coffee-400 transition-transform duration-200 group-open:rotate-180" aria-hidden="true">
            <ChevronDownIcon />
          </span>
        </summary>
        <div className="border-t border-cream-100 p-4 md:p-5">{children}</div>
      </details>
    );
  }
  return (
    <section className={`${shell} p-4 md:p-5`}>
      <div className="mb-4">{header}</div>
      {children}
    </section>
  );
}

function FormField({
  label,
  hint,
  error,
  className = '',
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-coffee-700">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-[11px] leading-snug text-coffee-400">{hint}</span>
      )}
    </label>
  );
}

// Peso amount with a "$" prefix and live thousands separators in a hint,
// while the stored value stays a plain number string.
function MoneyInput({
  value,
  onChange,
  placeholder,
  invalid = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-coffee-400">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={value ? Number(value).toLocaleString('es-CO') : ''}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder={placeholder ? Number(placeholder).toLocaleString('es-CO') : undefined}
        className={`${inputClass(invalid ? 'x' : undefined)} pl-7 tabular-nums`}
      />
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
  hint,
  compact = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={compact ? label : undefined}
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-3 text-left ${compact ? '' : 'w-full'}`}
    >
      <span
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-green-600' : 'bg-cream-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
          }`}
        />
      </span>
      {compact ? (
        <span className={`hidden text-xs md:inline ${checked ? 'text-green-700' : 'text-coffee-500'}`}>{label}</span>
      ) : (
        <span className="min-w-0">
          <span className="block text-sm font-medium text-coffee-900">{label}</span>
          {hint && <span className="mt-0.5 block text-xs leading-snug text-coffee-500">{hint}</span>}
        </span>
      )}
    </button>
  );
}

function StockBadge({ stock, low }: { stock: number; low: boolean }) {
  if (stock <= 0) return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Agotado</span>;
  return (
    <span className={`text-sm tabular-nums ${low ? 'font-medium text-amber-700' : 'text-coffee-700'}`}>
      {stock} u.{low && <span className="ml-1 text-[11px]">(bajo)</span>}
    </span>
  );
}

// Small dropdown: a trigger button and a popover list that closes on outside
// click or Escape.
function Menu({ label, icon = false, children }: { label: string; icon?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={icon ? label : undefined}
        className={
          icon
            ? 'flex h-8 w-8 items-center justify-center rounded-full text-coffee-600 transition-colors hover:bg-cream-100 hover:text-coffee-900'
            : 'flex items-center gap-1.5 rounded-full border border-cream-200 bg-white px-4 py-2 text-sm text-coffee-800 transition-colors hover:border-coffee-400'
        }
      >
        {icon ? <DotsIcon /> : (
          <>
            {label}
            <ChevronDownIcon />
          </>
        )}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className="absolute right-0 z-30 mt-1.5 w-52 rounded-xl border border-cream-200 bg-white p-1 shadow-[0_12px_32px_-12px_rgba(42,33,25,0.35)]"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  href,
  external = false,
  danger = false,
  children,
}: {
  onClick?: () => void;
  href?: string;
  external?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const className = `block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
    danger ? 'text-red-700 hover:bg-red-50' : 'text-coffee-800 hover:bg-cream-100'
  }`;
  if (href) {
    return (
      <a role="menuitem" href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" role="menuitem" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

// Plain <img> (no Next optimizer) so a thumbnail shows exactly whether the
// stored file URL itself loads; a dead URL gets a visible warning instead of
// an empty box.
function AdminThumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        title={`La imagen no carga: ${src}`}
        className="flex h-full w-full flex-col items-center justify-center bg-red-50 text-center text-[9px] font-medium leading-tight text-red-700"
      >
        <NoImageIcon />
        No carga
      </a>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />;
}

function NoImageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m4 18 5-5 3.5 3.5L18 11l2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

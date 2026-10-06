'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { formatCOP } from '@/lib/format';
import { colorToHex, COMMON_COLORS, parseColorImages, type ColorImages } from '@/lib/colors';
import { isOnSale, discountPercent } from '@/lib/discount';
import ChipListEditor from '@/components/admin/ChipListEditor';
import MediaUploader from '@/components/admin/MediaUploader';
import ReviewsManager from '@/components/admin/ReviewsManager';
import { variantKey, variantCombos, evenSplitStock, type VariantStock } from '@/lib/variants';

type Product = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  description: string;
  materials: string | null;
  details: string | null;
  careInstructions: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  costCents: number | null;
  images: string[];
  colorImages: ColorImages | null;
  videos: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  variants: VariantStock[];
  active: boolean;
  isPromo: boolean;
};

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
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

type FormState = {
  name: string;
  slug: string;
  brand: string;
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
  videos: string[];
  sizes: string[];
  colors: string[];
  isPromo: boolean;
};

const emptyForm: FormState = {
  name: '',
  slug: '',
  brand: '',
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
  videos: [],
  sizes: [],
  colors: [],
  isPromo: false,
};

// The form works in whole pesos (what an admin actually types and reads);
// priceCents in the API/DB stays in cents for consistency with the rest of
// the codebase (discounts, totals, Wompi amounts) — convert at this boundary.
function toForm(p: Product): FormState {
  return {
    name: p.name,
    slug: p.slug,
    brand: p.brand,
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
    colorImages: parseColorImages(p.colorImages),
    videos: p.videos,
    sizes: p.sizes,
    colors: p.colors,
    isPromo: p.isPromo,
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
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

  useEffect(() => {
    load();
  }, []);

  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))).sort(), [products]);

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
      if (brandFilter && p.brand !== brandFilter) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, query, brandFilter]);

  const startCreate = () => {
    setEditingId('new');
    setForm(emptyForm);
    setError('');
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setForm(toForm(p));
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.images.length === 0) {
      setError('Sube al menos una imagen');
      return;
    }
    if (form.sizes.length === 0) {
      setError('Agrega al menos una talla');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug,
      brand: form.brand,
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
      images: form.images,
      // Drop any leftover entry for a color that's since been removed from
      // the chip list, so deleting a color also clears its photo set.
      colorImages: Object.fromEntries(
        Object.entries(form.colorImages).filter(([color, urls]) => form.colors.includes(color) && urls.length > 0)
      ),
      videos: form.videos,
      sizes: form.sizes,
      colors: form.colors,
      isPromo: form.isPromo,
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
    setSaving(false);
    if (!res.ok) {
      setError('No se pudo guardar el producto');
      return;
    }
    cancelEdit();
    load();
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
    if (editingId === p.id) cancelEdit();
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900">Productos</h1>
        <div className="flex gap-2">
          <a
            href="/api/admin/export"
            className="rounded-full border border-cream-300 px-4 py-2 text-sm text-coffee-700 hover:border-coffee-600"
          >
            Exportar Excel
          </a>
          <label className="cursor-pointer rounded-full border border-cream-300 px-4 py-2 text-sm text-coffee-700 hover:border-coffee-600">
            {importing ? 'Importando…' : 'Importar Excel'}
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
          {editingId === null && (
            <button
              onClick={startCreate}
              className="rounded-full bg-coffee-900 px-4 py-2 text-sm font-medium text-cream-50"
            >
              + Nuevo producto
            </button>
          )}
        </div>
      </div>

      {importResult && (
        <div className="mb-6 rounded-xl border border-cream-200 p-4 text-sm">
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

      {editingId !== null && (
        <form onSubmit={handleSubmit} className="mb-10 max-w-2xl space-y-4 rounded-2xl border border-cream-200 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-coffee-700">
            {editingId === 'new' ? 'Nuevo producto' : 'Editar producto'}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nombre">
              <input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, slug: editingId === 'new' ? autoSlug(name, f.colors) : f.slug }));
                }}
                required
                className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Slug (url)">
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Marca">
              <input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                required
                list="brand-options"
                placeholder="Elige una marca existente o escribe una nueva"
                className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm"
              />
              <datalist id="brand-options">
                {brands.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Precio (COP)">
              <input type="number" min="0" step="1" placeholder="450000" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Precio antes del descuento (opcional)">
              <input type="number" min="0" step="1" placeholder="560000" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm" />
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-coffee-500">Descuento rápido:</span>
                {[10, 20, 30, 40, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    disabled={!form.price}
                    onClick={() =>
                      setForm({
                        ...form,
                        compareAtPrice: String(Math.round(Number(form.price) / (1 - pct / 100))),
                      })
                    }
                    className="rounded-full border border-cream-300 px-2 py-0.5 text-[11px] text-coffee-600 hover:border-coffee-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    -{pct}%
                  </button>
                ))}
                {form.compareAtPrice && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, compareAtPrice: '' })}
                    className="text-[11px] text-coffee-400 hover:text-coffee-700"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </FormField>
            <FormField label="Costo (COP) — solo interno">
              <input type="number" min="0" step="1" placeholder="180000" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm" />
              {form.cost && form.price && Number(form.price) > 0 && (
                <p className="mt-1 text-[11px] text-coffee-500">
                  Margen: {formatCOP(Math.round((Number(form.price) - Number(form.cost)) * 100))} (
                  {Math.round(((Number(form.price) - Number(form.cost)) / Number(form.price)) * 100)}%)
                </p>
              )}
            </FormField>
          </div>

          <label className="flex items-center gap-2.5 rounded-lg border border-cream-200 px-3 py-2.5 text-sm text-coffee-800">
            <input
              type="checkbox"
              checked={form.isPromo}
              onChange={(e) => setForm({ ...form, isPromo: e.target.checked })}
              className="h-4 w-4 accent-coffee-900"
            />
            Mostrar en Promos
            <span className="text-xs text-coffee-500">
              — aparece en /promos y en la sección de promociones del inicio, independiente del descuento
            </span>
          </label>

          <FormField label="Descripción">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm" rows={2} />
          </FormField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label="Materiales (opcional)">
              <textarea
                value={form.materials}
                onChange={(e) => setForm({ ...form, materials: e.target.value })}
                placeholder="100% algodón felpa francesa 400g"
                className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm"
                rows={3}
              />
            </FormField>
            <FormField label="Detalles del producto (opcional)">
              <textarea
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
                placeholder={'Un detalle por línea, ej:\nCorte oversized\nBolsillo canguro\nEtiqueta bordada'}
                className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm"
                rows={3}
              />
            </FormField>
            <FormField label="Recomendaciones de lavado (opcional)">
              <textarea
                value={form.careInstructions}
                onChange={(e) => setForm({ ...form, careInstructions: e.target.value })}
                placeholder="Lavar en frío, del revés, sin secadora"
                className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm"
                rows={3}
              />
            </FormField>
          </div>

          <ChipListEditor label="Tallas" items={form.sizes} onChange={(sizes) => setForm({ ...form, sizes })} suggestions={COMMON_SIZES} />
          <ChipListEditor
            label="Colores"
            items={form.colors}
            onChange={(colors) =>
              setForm((f) => ({ ...f, colors, slug: editingId === 'new' ? autoSlug(f.name, colors) : f.slug }))
            }
            suggestions={COMMON_COLORS}
            swatch={colorToHex}
          />

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-medium text-coffee-600">
                Stock por talla{form.colors.length > 0 ? ' y color' : ''}
              </p>
              <p className="text-xs text-coffee-500">
                Total: <span className="font-semibold text-coffee-800">{totalFormStock}</span>
              </p>
            </div>
            {form.sizes.length === 0 ? (
              <p className="text-xs text-coffee-400">Agrega al menos una talla para definir el stock.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-cream-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cream-200 bg-cream-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-coffee-600">Talla</th>
                      {(form.colors.length > 0 ? form.colors : ['Stock']).map((color) => (
                        <th key={color} className="px-3 py-2 text-left text-xs font-medium text-coffee-600">
                          {color}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.sizes.map((size) => (
                      <tr key={size} className="border-b border-cream-100 last:border-0">
                        <td className="px-3 py-2 text-xs font-medium text-coffee-700">{size}</td>
                        {(form.colors.length > 0 ? form.colors : [null]).map((color) => {
                          const key = variantKey(size, color);
                          return (
                            <td key={key} className="px-2 py-1.5">
                              <input
                                type="number"
                                min="0"
                                value={form.variantStock[key] ?? 0}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    variantStock: {
                                      ...form.variantStock,
                                      [key]: Math.max(0, Number(e.target.value)),
                                    },
                                  })
                                }
                                className="w-20 rounded-md border border-cream-200 px-2 py-1 text-sm focus:outline-none focus:border-coffee-600"
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

          <MediaUploader label="Imágenes" kind="image" items={form.images} onChange={(images) => setForm({ ...form, images })} />

          {form.colors.length > 1 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-coffee-600">Fotos por color (opcional)</p>
              <p className="mb-3 text-[11px] text-coffee-500">
                Si subes fotos para un color, la ficha del producto cambia a esas fotos cuando el cliente lo
                elige. Un color sin fotos propias sigue mostrando las imágenes de arriba.
              </p>
              <div className="space-y-4 rounded-lg border border-cream-200 p-3">
                {form.colors.map((color) => (
                  <div key={color}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full border border-cream-300"
                        style={{ backgroundColor: colorToHex(color) }}
                      />
                      <span className="text-xs font-medium text-coffee-700">{color}</span>
                    </div>
                    <MediaUploader
                      label=""
                      kind="image"
                      items={form.colorImages[color] ?? []}
                      onChange={(urls) =>
                        setForm({ ...form, colorImages: { ...form.colorImages, [color]: urls } })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <MediaUploader label="Videos" kind="video" items={form.videos} onChange={(videos) => setForm({ ...form, videos })} />

          {editingId !== 'new' && editingId !== null && <ReviewsManager productId={editingId} />}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-coffee-900 text-cream-50 py-2 px-6 rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={cancelEdit} className="py-2 px-6 rounded-lg text-sm text-coffee-600">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o marca…"
          className="w-full max-w-xs rounded-full border border-cream-200 px-4 py-2 text-sm focus:outline-none focus:border-coffee-600"
        />
        {brands.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setBrandFilter(null)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors ${
                brandFilter === null ? 'border-coffee-900 bg-coffee-900 text-cream-50' : 'border-cream-200 text-coffee-600 hover:border-coffee-600'
              }`}
            >
              Todas
            </button>
            {brands.map((b) => (
              <button
                key={b}
                onClick={() => setBrandFilter(b)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors ${
                  brandFilter === b ? 'border-coffee-900 bg-coffee-900 text-cream-50' : 'border-cream-200 text-coffee-600 hover:border-coffee-600'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        )}
        <span className="text-xs text-coffee-500">
          {filtered.length} de {products.length} producto{products.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="rounded-xl border border-dashed border-cream-300 p-8 text-center text-sm text-coffee-500">
            Ningún producto coincide con la búsqueda.
          </p>
        )}
        {filtered.map((p) => {
          const onSale = isOnSale(p.priceCents, p.compareAtPriceCents);
          const lowStock = p.active && p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD;
          return (
            <div key={p.id} className="flex items-center gap-4 rounded-xl border border-cream-200 p-3">
              <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-cream-100">
                {p.images[0] ? (
                  <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="56px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-coffee-300">
                    <NoImageIcon />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-coffee-900">{p.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      p.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {p.active ? 'Activo' : 'Inactivo'}
                  </span>
                  {onSale && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                      -{discountPercent(p.priceCents, p.compareAtPriceCents as number)}%
                    </span>
                  )}
                  {p.isPromo && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      Promo
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-coffee-600">
                  {p.brand} · {formatCOP(p.priceCents)} ·{' '}
                  <span className={lowStock ? 'font-medium text-amber-700' : ''}>
                    Stock: {p.stock}
                    {lowStock && ' (bajo)'}
                  </span>
                  {p.costCents != null && (
                    <>
                      {' · '}
                      <span className="text-coffee-400">
                        Margen: {formatCOP(p.priceCents - p.costCents)} (
                        {Math.round(((p.priceCents - p.costCents) / p.priceCents) * 100)}%)
                      </span>
                    </>
                  )}
                </p>
                {p.colors.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1">
                    {p.colors.map((c) => (
                      <span
                        key={c}
                        title={c}
                        className="h-3.5 w-3.5 rounded-full border border-cream-300"
                        style={{ backgroundColor: colorToHex(c) }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 gap-3">
                <button onClick={() => startEdit(p)} className="text-sm text-coffee-700 hover:text-coffee-900">
                  Editar
                </button>
                <button onClick={() => duplicate(p)} className="text-sm text-coffee-700 hover:text-coffee-900">
                  Duplicar
                </button>
                <button onClick={() => togglePromo(p)} className={`text-sm ${p.isPromo ? 'text-amber-800' : 'text-coffee-700 hover:text-coffee-900'}`}>
                  {p.isPromo ? 'Quitar de Promos' : 'Agregar a Promos'}
                </button>
                <button onClick={() => toggleActive(p)} className={`text-sm ${p.active ? 'text-red-600' : 'text-green-700'}`}>
                  {p.active ? 'Desactivar' : 'Reactivar'}
                </button>
                <button onClick={() => deleteProduct(p)} className="text-sm text-red-700 hover:text-red-900">
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FormField({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs text-coffee-600">{label}</span>
      {children}
    </label>
  );
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

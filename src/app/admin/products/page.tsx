'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { formatCOP } from '@/lib/format';
import { colorToHex, COMMON_COLORS } from '@/lib/colors';
import { isOnSale, discountPercent } from '@/lib/discount';
import ChipListEditor from '@/components/admin/ChipListEditor';
import MediaUploader from '@/components/admin/MediaUploader';

type Product = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  description: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  images: string[];
  videos: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  active: boolean;
};

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const LOW_STOCK_THRESHOLD = 5;

type FormState = {
  name: string;
  slug: string;
  brand: string;
  description: string;
  priceCents: string;
  compareAtPriceCents: string;
  stock: string;
  images: string[];
  videos: string[];
  sizes: string[];
  colors: string[];
};

const emptyForm: FormState = {
  name: '',
  slug: '',
  brand: '',
  description: '',
  priceCents: '',
  compareAtPriceCents: '',
  stock: '',
  images: [],
  videos: [],
  sizes: [],
  colors: [],
};

function toForm(p: Product): FormState {
  return {
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    description: p.description,
    priceCents: String(p.priceCents),
    compareAtPriceCents: p.compareAtPriceCents ? String(p.compareAtPriceCents) : '',
    stock: String(p.stock),
    images: p.images,
    videos: p.videos,
    sizes: p.sizes,
    colors: p.colors,
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

  const load = async () => {
    const res = await fetch('/api/products');
    if (res.ok) setProducts(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))).sort(), [products]);

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
      priceCents: Number(form.priceCents),
      compareAtPriceCents: form.compareAtPriceCents ? Number(form.compareAtPriceCents) : null,
      stock: Number(form.stock),
      images: form.images,
      videos: form.videos,
      sizes: form.sizes,
      colors: form.colors,
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

  const duplicate = async (p: Product) => {
    const res = await fetch(`/api/products/${p.id}/duplicate`, { method: 'POST' });
    if (!res.ok) return;
    const copy: Product = await res.json();
    await load();
    startEdit(copy);
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

      {editingId !== null && (
        <form onSubmit={handleSubmit} className="mb-10 max-w-2xl space-y-4 rounded-2xl border border-cream-200 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-coffee-700">
            {editingId === 'new' ? 'Nuevo producto' : 'Editar producto'}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nombre">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Slug (url)">
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Marca">
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Precio en centavos (COP)">
              <input type="number" value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: e.target.value })} required className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Precio antes del descuento (opcional)">
              <input type="number" value={form.compareAtPriceCents} onChange={(e) => setForm({ ...form, compareAtPriceCents: e.target.value })} className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm" />
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-coffee-500">Descuento rápido:</span>
                {[10, 20, 30, 40, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    disabled={!form.priceCents}
                    onClick={() =>
                      setForm({
                        ...form,
                        compareAtPriceCents: String(Math.round(Number(form.priceCents) / (1 - pct / 100))),
                      })
                    }
                    className="rounded-full border border-cream-300 px-2 py-0.5 text-[11px] text-coffee-600 hover:border-coffee-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    -{pct}%
                  </button>
                ))}
                {form.compareAtPriceCents && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, compareAtPriceCents: '' })}
                    className="text-[11px] text-coffee-400 hover:text-coffee-700"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </FormField>
            <FormField label="Stock" className="col-span-2">
              <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm" />
            </FormField>
          </div>

          <FormField label="Descripción">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm" rows={2} />
          </FormField>

          <ChipListEditor label="Tallas" items={form.sizes} onChange={(sizes) => setForm({ ...form, sizes })} suggestions={COMMON_SIZES} />
          <ChipListEditor label="Colores" items={form.colors} onChange={(colors) => setForm({ ...form, colors })} suggestions={COMMON_COLORS} swatch={colorToHex} />

          <MediaUploader label="Imágenes" kind="image" items={form.images} onChange={(images) => setForm({ ...form, images })} />
          <MediaUploader label="Videos" kind="video" items={form.videos} onChange={(videos) => setForm({ ...form, videos })} />

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
                </div>
                <p className="mt-0.5 text-sm text-coffee-600">
                  {p.brand} · {formatCOP(p.priceCents)} ·{' '}
                  <span className={lowStock ? 'font-medium text-amber-700' : ''}>
                    Stock: {p.stock}
                    {lowStock && ' (bajo)'}
                  </span>
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
                <button onClick={() => toggleActive(p)} className={`text-sm ${p.active ? 'text-red-600' : 'text-green-700'}`}>
                  {p.active ? 'Desactivar' : 'Reactivar'}
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

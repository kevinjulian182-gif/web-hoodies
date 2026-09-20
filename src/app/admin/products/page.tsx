'use client';

import { useEffect, useState } from 'react';
import { formatCOP } from '@/lib/format';
import { colorToHex, COMMON_COLORS } from '@/lib/colors';
import ChipListEditor from '@/components/admin/ChipListEditor';
import MediaUploader from '@/components/admin/MediaUploader';

type Product = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  description: string;
  priceCents: number;
  images: string[];
  videos: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  active: boolean;
};

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

type FormState = {
  name: string;
  slug: string;
  brand: string;
  description: string;
  priceCents: string;
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

  const load = async () => {
    const res = await fetch('/api/products');
    if (res.ok) setProducts(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

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
            <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="border border-cream-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Slug (url)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required className="border border-cream-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Marca" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required className="border border-cream-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Precio en centavos (COP)" type="number" value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: e.target.value })} required className="border border-cream-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required className="col-span-2 border border-cream-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          <textarea placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="w-full border border-cream-200 rounded-lg px-3 py-2 text-sm" rows={2} />

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

      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.id} className="border border-cream-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-coffee-900">
                {p.name} {!p.active && <span className="text-xs text-red-600">(inactivo)</span>}
              </p>
              <p className="text-sm text-coffee-600">
                {p.brand} · {formatCOP(p.priceCents)} · Stock: {p.stock}
                {p.colors.length > 0 && ` · ${p.colors.join(', ')}`}
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <button onClick={() => startEdit(p)} className="text-sm text-coffee-700 hover:text-coffee-900">
                Editar
              </button>
              <button onClick={() => toggleActive(p)} className={`text-sm ${p.active ? 'text-red-600' : 'text-green-700'}`}>
                {p.active ? 'Desactivar' : 'Reactivar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

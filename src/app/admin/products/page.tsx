'use client';

import { useEffect, useState } from 'react';
import { formatCOP } from '@/lib/format';

type Product = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  priceCents: number;
  stock: number;
  active: boolean;
};

const emptyForm = {
  name: '',
  slug: '',
  brand: '',
  description: '',
  priceCents: '',
  images: '',
  sizes: 'S,M,L,XL',
  stock: '',
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = async () => {
    const res = await fetch('/api/products');
    if (res.ok) setProducts(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        brand: form.brand,
        description: form.description,
        priceCents: Number(form.priceCents),
        images: form.images.split(',').map((s) => s.trim()).filter(Boolean),
        sizes: form.sizes.split(',').map((s) => s.trim()).filter(Boolean),
        stock: Number(form.stock),
      }),
    });
    if (!res.ok) {
      setError('No se pudo crear el producto');
      return;
    }
    setForm(emptyForm);
    load();
  };

  const handleDeactivate = async (id: string) => {
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900 mb-6">Productos</h1>

      <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 mb-10 max-w-2xl">
        <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="border border-cream-200 rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Slug (url)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required className="border border-cream-200 rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Marca" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required className="border border-cream-200 rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Precio en centavos (COP)" type="number" value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: e.target.value })} required className="border border-cream-200 rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required className="border border-cream-200 rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Tallas (S,M,L,XL)" value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} required className="border border-cream-200 rounded-lg px-3 py-2 text-sm" />
        <input placeholder="URLs de imágenes (separadas por coma)" value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} required className="col-span-2 border border-cream-200 rounded-lg px-3 py-2 text-sm" />
        <textarea placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="col-span-2 border border-cream-200 rounded-lg px-3 py-2 text-sm" rows={2} />
        {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
        <button type="submit" className="col-span-2 bg-coffee-900 text-cream-50 py-2 rounded-lg text-sm font-medium">
          Crear producto
        </button>
      </form>

      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.id} className="border border-cream-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-coffee-900">{p.name}</p>
              <p className="text-sm text-coffee-600">{p.brand} · {formatCOP(p.priceCents)} · Stock: {p.stock}</p>
            </div>
            <button onClick={() => handleDeactivate(p.id)} className="text-sm text-red-600">
              Desactivar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

type Coupon = {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  value: number;
  active: boolean;
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<{ code: string; discountType: 'PERCENT' | 'FIXED'; value: string }>({
    code: '',
    discountType: 'PERCENT',
    value: '',
  });
  const [error, setError] = useState('');

  const load = async () => {
    const res = await fetch('/api/coupons');
    if (res.ok) setCoupons(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, value: Number(form.value) }),
    });
    if (!res.ok) {
      setError('No se pudo crear el cupón');
      return;
    }
    setForm({ code: '', discountType: 'PERCENT', value: '' });
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900 mb-6">Cupones</h1>

      <form onSubmit={handleCreate} className="flex gap-3 mb-8 max-w-xl">
        <input
          placeholder="CÓDIGO"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          required
          className="border border-cream-200 rounded-lg px-3 py-2 text-sm flex-1"
        />
        <select
          value={form.discountType}
          onChange={(e) => setForm({ ...form, discountType: e.target.value as 'PERCENT' | 'FIXED' })}
          className="border border-cream-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="PERCENT">% Porcentaje</option>
          <option value="FIXED">$ Fijo (centavos)</option>
        </select>
        <input
          placeholder="Valor"
          type="number"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
          required
          className="border border-cream-200 rounded-lg px-3 py-2 text-sm w-32"
        />
        <button type="submit" className="bg-coffee-900 text-cream-50 px-4 py-2 rounded-lg text-sm font-medium">
          Crear
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="space-y-2">
        {coupons.map((c) => (
          <div key={c.id} className="border border-cream-200 rounded-xl p-4 flex justify-between">
            <span className="font-mono text-coffee-900">{c.code}</span>
            <span className="text-sm text-coffee-600">
              {c.discountType === 'PERCENT' ? `${c.value}%` : `$${c.value / 100}`}
            </span>
            <span className="text-xs text-coffee-500">{c.active ? 'Activo' : 'Inactivo'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { formatCOP } from '@/lib/format';

type Coupon = {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  value: number;
  active: boolean;
  expiresAt: string | null;
};

function isExpired(c: Coupon) {
  return c.expiresAt !== null && new Date(c.expiresAt) < new Date();
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ code: string; discountType: 'PERCENT' | 'FIXED'; value: string }>({
    code: '',
    discountType: 'PERCENT',
    value: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/coupons');
    if (res.ok) setCoupons(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amount = Number(form.value);
    if (form.discountType === 'PERCENT' && (amount < 1 || amount > 100)) {
      setError('El porcentaje debe estar entre 1 y 100.');
      return;
    }
    setBusy('create');
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Fixed discounts are typed in pesos; the store keeps money in cents.
      body: JSON.stringify({ ...form, value: form.discountType === 'FIXED' ? Math.round(amount * 100) : amount }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'No se pudo crear el cupón. Revisa el código y el valor.');
      return;
    }
    setForm({ code: '', discountType: 'PERCENT', value: '' });
    load();
  };

  const toggle = async (coupon: Coupon) => {
    setBusy(coupon.id);
    // Optimistic: the switch moves at once and rolls back if the save fails.
    setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, active: !c.active } : c)));
    const res = await fetch(`/api/coupons/${coupon.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !coupon.active }),
    });
    if (!res.ok) {
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, active: coupon.active } : c)));
      setError(`No se pudo ${coupon.active ? 'desactivar' : 'activar'} ${coupon.code}.`);
    }
    setBusy(null);
  };

  const remove = async (coupon: Coupon) => {
    if (!confirm(`¿Eliminar el cupón ${coupon.code}? Los clientes ya no podrán usarlo. Esta acción no se puede deshacer.`)) {
      return;
    }
    setBusy(coupon.id);
    const res = await fetch(`/api/coupons/${coupon.id}`, { method: 'DELETE' });
    setBusy(null);
    if (!res.ok) {
      setError(`No se pudo eliminar ${coupon.code}.`);
      return;
    }
    setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900 mb-2">Cupones</h1>
      <p className="mb-6 text-sm text-coffee-600">
        Crea códigos de descuento para el checkout. Desactiva un cupón para pausarlo sin perderlo, o elimínalo si ya no
        lo vas a usar.
      </p>

      <form onSubmit={handleCreate} className="mb-3 flex flex-wrap gap-3">
        <input
          placeholder="CÓDIGO"
          aria-label="Código del cupón"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
          required
          minLength={3}
          autoCapitalize="characters"
          autoCorrect="off"
          className="min-w-[10rem] flex-1 rounded-lg border border-cream-200 px-3 py-2.5 font-mono text-base sm:text-sm"
        />
        <select
          aria-label="Tipo de descuento"
          value={form.discountType}
          onChange={(e) => setForm({ ...form, discountType: e.target.value as 'PERCENT' | 'FIXED' })}
          className="rounded-lg border border-cream-200 px-3 py-2.5 text-base sm:text-sm"
        >
          <option value="PERCENT">% Porcentaje</option>
          <option value="FIXED">$ Valor fijo (pesos)</option>
        </select>
        <input
          placeholder={form.discountType === 'PERCENT' ? 'Ej: 10' : 'Ej: 20000'}
          aria-label="Valor del descuento"
          type="number"
          inputMode="numeric"
          min={1}
          max={form.discountType === 'PERCENT' ? 100 : undefined}
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
          required
          className="w-32 rounded-lg border border-cream-200 px-3 py-2.5 text-base sm:text-sm"
        />
        <button
          type="submit"
          disabled={busy === 'create'}
          className="rounded-lg bg-coffee-900 px-4 py-2.5 text-sm font-medium text-cream-50 transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {busy === 'create' ? 'Creando…' : 'Crear'}
        </button>
      </form>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-2">
        {loading && <p className="text-sm text-coffee-600">Cargando…</p>}
        {!loading && coupons.length === 0 && (
          <p className="rounded-xl border border-dashed border-cream-200 p-6 text-center text-sm text-coffee-600">
            Aún no tienes cupones. Crea el primero arriba.
          </p>
        )}
        {coupons.map((c) => {
          const expired = isExpired(c);
          return (
            <div
              key={c.id}
              className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-cream-200 p-4 transition-opacity ${
                c.active && !expired ? '' : 'opacity-60'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono font-medium text-coffee-900">{c.code}</p>
                <p className="text-sm text-coffee-600">
                  {c.discountType === 'PERCENT' ? `${c.value}% de descuento` : `${formatCOP(c.value)} de descuento`}
                  {c.expiresAt &&
                    ` · ${expired ? 'venció' : 'vence'} el ${new Date(c.expiresAt).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}`}
                </p>
              </div>

              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-coffee-700">
                <span className="w-16 text-right">{c.active ? 'Activo' : 'Inactivo'}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={c.active}
                  aria-label={`${c.active ? 'Desactivar' : 'Activar'} ${c.code}`}
                  onClick={() => toggle(c)}
                  disabled={busy === c.id}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coffee-900/30 disabled:opacity-60 ${
                    c.active ? 'bg-green-600' : 'bg-cream-200'
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out ${
                      c.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>

              <button
                type="button"
                onClick={() => remove(c)}
                disabled={busy === c.id}
                className="rounded-lg px-2 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

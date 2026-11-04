'use client';

import { useState } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, todayInColombia } from '@/lib/accountingConfig';

const field =
  'mt-1 w-full rounded-lg border border-cream-200 bg-white px-3 py-2.5 text-base text-coffee-900 outline-none transition-colors focus:border-coffee-600 sm:text-sm';
const caption = 'text-xs font-medium text-coffee-700';

/** Records an expense or an income that isn't an order or a purchase. */
export default function EntryForm({ onSaved }: { onSaved: () => void }) {
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [form, setForm] = useState({
    date: todayInColombia(),
    category: EXPENSE_CATEGORIES[0] as string,
    description: '',
    amount: '',
    method: 'Transferencia',
    reference: '',
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const categories: readonly string[] = type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: key === 'amount' ? e.target.value.replace(/\D/g, '') : e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    const res = await fetch('/api/admin/cuentas/movimientos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        date: form.date,
        category: form.category,
        description: form.description,
        amountCents: (Number(form.amount) || 0) * 100,
        method: form.method,
        reference: form.reference,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setNotice({ ok: false, text: data.error ?? 'No se pudo guardar.' });
    setForm((f) => ({ ...f, description: '', amount: '', reference: '' }));
    setNotice({ ok: true, text: type === 'EXPENSE' ? 'Gasto registrado.' : 'Ingreso registrado.' });
    onSaved();
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-cream-200 bg-white p-4">
      <div className="mb-4 flex rounded-lg border border-cream-200 bg-cream-50 p-1 text-sm sm:w-fit" role="radiogroup" aria-label="Tipo">
        {(
          [
            ['EXPENSE', 'Gasto'],
            ['INCOME', 'Ingreso'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            onClick={() => {
              setType(value);
              setForm((f) => ({ ...f, category: value === 'EXPENSE' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0] }));
            }}
            className={`flex-1 rounded-md px-4 py-1.5 transition-colors sm:flex-none ${
              type === value ? 'bg-coffee-900 font-medium text-cream-50' : 'text-coffee-700 hover:bg-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className={caption}>Categoría</span>
          <select value={form.category} onChange={set('category')} className={field}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-1 lg:col-span-2">
          <span className={caption}>Descripción *</span>
          <input
            value={form.description}
            onChange={set('description')}
            required
            placeholder={type === 'EXPENSE' ? 'Ej: Pauta Instagram semana 1' : 'Ej: Venta en feria'}
            className={field}
          />
        </label>
        <label className="block">
          <span className={caption}>Valor ($) *</span>
          <input value={form.amount} onChange={set('amount')} required inputMode="numeric" placeholder="0" className={field} />
        </label>
        <label className="block">
          <span className={caption}>Fecha</span>
          <input type="date" value={form.date} onChange={set('date')} required className={field} />
        </label>
        <label className="block">
          <span className={caption}>Medio de pago</span>
          <select value={form.method} onChange={set('method')} className={field}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className={caption}>Referencia o comprobante</span>
          <input value={form.reference} onChange={set('reference')} placeholder="N.º de factura, guía, transacción…" className={field} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-coffee-900 px-4 py-2.5 text-sm font-medium text-cream-50 transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? 'Guardando…' : type === 'EXPENSE' ? 'Registrar gasto' : 'Registrar ingreso'}
        </button>
        {notice && (
          <p role="status" className={`text-sm ${notice.ok ? 'text-green-700' : 'text-red-700'}`}>
            {notice.text}
          </p>
        )}
      </div>
    </form>
  );
}

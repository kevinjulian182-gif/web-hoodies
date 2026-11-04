'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatCOP } from '@/lib/format';
import { PAYMENT_METHODS, todayInColombia } from '@/lib/accountingConfig';

type Product = {
  id: string;
  name: string;
  brand: string;
  costCents: number | null;
  sizes: string[];
  colors: string[];
};

type Line = { key: number; productId: string; description: string; size: string; color: string; quantity: string; unitCost: string };

let nextKey = 1;
const emptyLine = (): Line => ({ key: nextKey++, productId: '', description: '', size: '', color: '', quantity: '1', unitCost: '' });

const field =
  'mt-1 w-full rounded-lg border border-cream-200 bg-white px-3 py-2.5 text-base text-coffee-900 outline-none transition-colors focus:border-coffee-600 sm:text-sm';
const caption = 'text-xs font-medium text-coffee-700';

/** Slide-over to register merchandise bought from a supplier. */
export default function PurchasePanel({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ date: todayInColombia(), supplier: '', invoiceNumber: '', paymentMethod: 'Transferencia', notes: '' });
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [addToStock, setAddToStock] = useState(true);
  const [updateCost, setUpdateCost] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/gestor/products', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setProducts)
      .catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const setLine = (key: number, patch: Partial<Line>) =>
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        if (patch.productId !== undefined) {
          const p = byId.get(patch.productId);
          next.description = p ? `${p.name} · ${p.brand}` : '';
          next.size = '';
          next.color = p?.colors.length === 1 ? p.colors[0] : '';
          next.unitCost = p?.costCents ? String(Math.round(p.costCents / 100)) : '';
        }
        return next;
      })
    );

  const totalCents = lines.reduce((n, l) => n + (Number(l.unitCost) || 0) * 100 * (Number(l.quantity) || 0), 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const items = lines.filter((l) => l.productId || l.description.trim());
    if (!items.length) return setError('Agrega al menos un artículo.');
    setSaving(true);
    const res = await fetch('/api/admin/cuentas/compras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        addToStock,
        updateCost,
        items: items.map((l) => ({
          productId: l.productId || undefined,
          description: l.description.trim() || byId.get(l.productId)?.name || 'Artículo',
          size: l.size || undefined,
          color: l.color || undefined,
          quantity: Math.max(1, Number(l.quantity) || 1),
          unitCostCents: Math.round((Number(l.unitCost) || 0) * 100),
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(data.error ?? 'No se pudo guardar la compra.');
    onSaved();
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Nueva compra">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-coffee-900/40" />
      <form onSubmit={submit} className="relative flex h-dvh w-full max-w-xl flex-col bg-cream-50 shadow-[0_0_48px_-12px_rgba(41,28,19,0.45)]">
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-coffee-900">Nueva compra de mercancía</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-coffee-600 hover:bg-cream-100">
            Cerrar
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
          <fieldset className="grid grid-cols-2 gap-3">
            <legend className="mb-2 text-sm font-semibold text-coffee-900">Compra</legend>
            <label className="col-span-2 block">
              <span className={caption}>Proveedor *</span>
              <input value={form.supplier} onChange={set('supplier')} required placeholder="Ej: Confecciones Medellín" className={field} />
            </label>
            <label className="block">
              <span className={caption}>Fecha *</span>
              <input type="date" value={form.date} onChange={set('date')} required className={field} />
            </label>
            <label className="block">
              <span className={caption}>N.º de factura</span>
              <input value={form.invoiceNumber} onChange={set('invoiceNumber')} className={field} />
            </label>
            <label className="col-span-2 block">
              <span className={caption}>Forma de pago</span>
              <select value={form.paymentMethod} onChange={set('paymentMethod')} className={field}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold text-coffee-900">Artículos</legend>
            {lines.map((line) => {
              const product = byId.get(line.productId);
              return (
                <div key={line.key} className="rounded-xl border border-cream-200 bg-white p-3">
                  <div className="flex items-start gap-2">
                    <label className="block min-w-0 flex-1">
                      <span className="sr-only">Producto</span>
                      <select value={line.productId} onChange={(e) => setLine(line.key, { productId: e.target.value })} className={`${field} mt-0`}>
                        <option value="">Otro (no es del inventario)</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · {p.brand}
                          </option>
                        ))}
                      </select>
                    </label>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                        className="mt-1 rounded-lg px-2 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  {!product && (
                    <label className="mt-3 block">
                      <span className={caption}>Descripción</span>
                      <input
                        value={line.description}
                        onChange={(e) => setLine(line.key, { description: e.target.value })}
                        placeholder="Bolsas, etiquetas, tela…"
                        className={field}
                      />
                    </label>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {product && product.colors.length > 0 && (
                      <label className="block">
                        <span className={caption}>Color</span>
                        <select value={line.color} onChange={(e) => setLine(line.key, { color: e.target.value })} className={field}>
                          <option value="">—</option>
                          {product.colors.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    {product && product.sizes.length > 0 && (
                      <label className="block">
                        <span className={caption}>Talla</span>
                        <select value={line.size} onChange={(e) => setLine(line.key, { size: e.target.value })} className={field}>
                          <option value="">—</option>
                          {product.sizes.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="block">
                      <span className={caption}>Cantidad</span>
                      <input
                        value={line.quantity}
                        onChange={(e) => setLine(line.key, { quantity: e.target.value.replace(/\D/g, '') })}
                        inputMode="numeric"
                        className={field}
                      />
                    </label>
                    <label className="block">
                      <span className={caption}>Costo c/u ($)</span>
                      <input
                        value={line.unitCost}
                        onChange={(e) => setLine(line.key, { unitCost: e.target.value.replace(/\D/g, '') })}
                        inputMode="numeric"
                        required
                        className={field}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
              className="text-sm font-medium text-coffee-800 underline underline-offset-4"
            >
              + Agregar otro artículo
            </button>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-coffee-900">Inventario</legend>
            <label className="flex items-start gap-2.5 text-sm text-coffee-800">
              <input type="checkbox" checked={addToStock} onChange={(e) => setAddToStock(e.target.checked)} className="mt-0.5 h-4 w-4 accent-coffee-900" />
              <span>
                Sumar las unidades al inventario de la tienda
                <span className="block text-xs text-coffee-500">Solo los productos del inventario; necesitan talla y color.</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-sm text-coffee-800">
              <input type="checkbox" checked={updateCost} onChange={(e) => setUpdateCost(e.target.checked)} className="mt-0.5 h-4 w-4 accent-coffee-900" />
              <span>
                Guardar este costo como el costo del producto
                <span className="block text-xs text-coffee-500">Con él se calcula la utilidad de cada venta.</span>
              </span>
            </label>
          </fieldset>

          <label className="block">
            <span className={caption}>Notas</span>
            <textarea value={form.notes} onChange={set('notes')} rows={2} className={field} />
          </label>
        </div>

        <div className="border-t border-cream-200 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="mb-3 flex items-baseline justify-between text-sm">
            <span className="text-coffee-600">Total de la compra</span>
            <span className="text-lg font-semibold tabular-nums text-coffee-900">{formatCOP(totalCents)}</span>
          </div>
          {error && (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-coffee-900 px-4 py-3 text-sm font-medium text-cream-50 transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Registrar compra'}
          </button>
        </div>
      </form>
    </div>
  );
}

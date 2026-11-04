'use client';

import { useEffect, useMemo, useState } from 'react';
import { COLOMBIA_DEPARTMENTS } from '@/lib/colombia';
import { formatCOP } from '@/lib/format';
import { variantKey } from '@/lib/variants';
import type { ManagedOrder } from './types';
import type { ParsedOrder } from '@/lib/orderText';

type Product = {
  id: string;
  name: string;
  brand: string;
  priceCents: number;
  image: string | null;
  sizes: string[];
  colors: string[];
  stock: number;
  active: boolean;
  variants: { size: string; color: string | null; stock: number }[];
};

type Line = { key: number; productId: string; color: string; size: string; quantity: number; price: string };

const field =
  'mt-1 w-full rounded-lg border border-cream-200 bg-white px-3 py-2.5 text-base text-coffee-900 outline-none transition-colors focus:border-coffee-600 sm:text-sm';
const caption = 'text-xs font-medium text-coffee-700';

/** Units left for a size+color; products without variants share one total. */
function available(product: Product, size: string, color: string) {
  if (product.variants.length === 0) return product.stock;
  return product.variants.find((v) => variantKey(v.size, v.color) === variantKey(size, color || null))?.stock ?? 0;
}

let nextKey = 1;
const emptyLine = (): Line => ({ key: nextKey++, productId: '', color: '', size: '', quantity: 1, price: '' });

export default function NewOrderPanel({
  onClose,
  onCreated,
  initialPayment = 'COD',
}: {
  onClose: () => void;
  onCreated: (order: ManagedOrder) => void;
  initialPayment?: 'COD' | 'TRANSFER' | 'CREDIT';
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customer, setCustomer] = useState({
    customerName: '',
    shippingPhone: '',
    customerDocument: '',
    customerEmail: '',
    shippingAddress: '',
    shippingAddressComplement: '',
    shippingCity: '',
    shippingDepartment: '',
    deliveryNotes: '',
  });
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'TRANSFER' | 'CREDIT'>(initialPayment);
  const [shipping, setShipping] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reading, setReading] = useState(false);
  const [readNotice, setReadNotice] = useState<{ ok: boolean; text: string } | null>(null);

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
          next.color = p?.colors.length === 1 ? p.colors[0] : '';
          next.size = '';
          next.quantity = 1;
          next.price = p ? String(Math.round(p.priceCents / 100)) : '';
        }
        if (patch.color !== undefined) next.size = '';
        return next;
      })
    );

  /** Fills the form from a pasted customer message; the admin reviews it. */
  const readMessage = async () => {
    setReading(true);
    setReadNotice(null);
    const res = await fetch('/api/admin/gestor/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
    const data = await res.json().catch(() => ({}));
    setReading(false);
    if (!res.ok) return setReadNotice({ ok: false, text: data.error ?? 'No se pudo leer el mensaje.' });

    const order = data.order as ParsedOrder;
    const found = Object.fromEntries(
      (Object.keys(customer) as (keyof typeof customer)[])
        .filter((key) => order[key])
        .map((key) => [key, String(order[key])])
    );
    setCustomer((c) => ({ ...c, ...found }));
    if (order.paymentMethod) setPaymentMethod(order.paymentMethod);
    if (order.items.length) {
      setLines(
        order.items.map((item) => {
          const product = byId.get(item.productId);
          return {
            key: nextKey++,
            productId: item.productId,
            color: item.color ?? '',
            size: item.size ?? '',
            quantity: item.quantity,
            price: product ? String(Math.round(product.priceCents / 100)) : '',
          };
        })
      );
    }

    const missing = [
      !found.customerName && 'nombre',
      !found.shippingPhone && 'celular',
      !found.shippingAddress && 'dirección',
      !found.shippingCity && 'ciudad',
      !order.items.length && 'productos',
      order.items.some((i) => !i.size) && 'talla',
    ].filter(Boolean);
    const filled = Object.keys(found).length + (order.items.length ? 1 : 0);
    setReadNotice({
      ok: filled > 0,
      text:
        filled === 0
          ? 'No encontré datos del pedido en el mensaje. Llénalo a mano.'
          : `${data.source === 'ai' ? 'Leído con IA' : 'Leído'}: revisa los datos antes de registrar.${
              missing.length ? ` Falta: ${missing.join(', ')}.` : ''
            }${data.warning ? ` ${data.warning}` : ''}`,
    });
  };

  const subtotalCents = lines.reduce((sum, l) => sum + (Number(l.price) || 0) * 100 * l.quantity, 0);
  const shippingCents = (Number(shipping) || 0) * 100;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const filled = lines.filter((l) => l.productId);
    for (const l of filled) {
      const p = byId.get(l.productId)!;
      if (p.colors.length > 0 && !l.color) return setError(`Elige el color de ${p.name}.`);
      if (!l.size) return setError(`Elige la talla de ${p.name}.`);
      if (l.quantity > available(p, l.size, l.color)) return setError(`No hay suficiente stock de ${p.name} talla ${l.size}.`);
    }
    if (filled.length === 0) return setError('Agrega al menos un producto.');
    setSaving(true);
    const res = await fetch('/api/admin/gestor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...customer,
        paymentMethod,
        shippingCents,
        items: filled.map((l) => ({
          productId: l.productId,
          size: l.size,
          color: l.color || undefined,
          quantity: l.quantity,
          priceCents: Math.round((Number(l.price) || 0) * 100),
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(data.error ?? 'No se pudo registrar el pedido.');
    onCreated(data);
  };

  const set = (key: keyof typeof customer) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setCustomer((c) => ({ ...c, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Nuevo pedido">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-coffee-900/40" />
      <form
        onSubmit={submit}
        className="relative flex h-dvh w-full max-w-xl flex-col bg-cream-50 shadow-[0_0_48px_-12px_rgba(41,28,19,0.45)]"
      >
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-coffee-900">Nuevo pedido</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-coffee-600 hover:bg-cream-100">
            Cerrar
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-5">
          <section className="rounded-xl border border-dashed border-coffee-300 bg-white p-3">
            <label className="block">
              <span className="text-sm font-semibold text-coffee-900">Pegar mensaje del cliente</span>
              <span className="block text-xs text-coffee-500">
                Copia el chat de WhatsApp o Instagram y los datos se llenan solos.
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder={'Nombre: Laura Restrepo\nCel: 315 777 8899\nDirección: Calle 10 # 34-56\nCali, Valle del Cauca\n1 Trefoil Hoodie talla S crema'}
                className={`${field} resize-y font-normal`}
              />
            </label>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={readMessage}
                disabled={reading || !message.trim() || products.length === 0}
                className="rounded-lg bg-coffee-900 px-4 py-2 text-sm font-medium text-cream-50 transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {reading ? 'Leyendo…' : 'Llenar con el mensaje'}
              </button>
              {readNotice && (
                <p role="status" className={`text-xs ${readNotice.ok ? 'text-green-700' : 'text-red-700'}`}>
                  {readNotice.text}
                </p>
              )}
            </div>
          </section>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold text-coffee-900">Cliente</legend>
            <label className="block">
              <span className={caption}>Nombre completo *</span>
              <input value={customer.customerName} onChange={set('customerName')} required autoComplete="off" className={field} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={caption}>Celular *</span>
                <input value={customer.shippingPhone} onChange={set('shippingPhone')} required type="tel" inputMode="tel" className={field} />
              </label>
              <label className="block">
                <span className={caption}>Cédula</span>
                <input value={customer.customerDocument} onChange={set('customerDocument')} inputMode="numeric" className={field} />
              </label>
            </div>
            <label className="block">
              <span className={caption}>Correo (para enviarle la guía)</span>
              <input value={customer.customerEmail} onChange={set('customerEmail')} type="email" autoCapitalize="none" className={field} />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold text-coffee-900">Entrega</legend>
            <label className="block">
              <span className={caption}>Dirección *</span>
              <input value={customer.shippingAddress} onChange={set('shippingAddress')} required placeholder="Calle 10 # 20-30" className={field} />
            </label>
            <label className="block">
              <span className={caption}>Apto, torre, barrio</span>
              <input value={customer.shippingAddressComplement} onChange={set('shippingAddressComplement')} className={field} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={caption}>Ciudad *</span>
                <input value={customer.shippingCity} onChange={set('shippingCity')} required className={field} />
              </label>
              <label className="block">
                <span className={caption}>Departamento</span>
                <select value={customer.shippingDepartment} onChange={set('shippingDepartment')} className={field}>
                  <option value="">—</option>
                  {COLOMBIA_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className={caption}>Indicaciones</span>
              <input value={customer.deliveryNotes} onChange={set('deliveryNotes')} placeholder="Portería, horario…" className={field} />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold text-coffee-900">Productos</legend>
            {lines.map((line) => {
              const product = byId.get(line.productId);
              const needsColor = Boolean(product && product.colors.length > 0);
              const left = product && line.size ? available(product, line.size, line.color) : null;
              return (
                <div key={line.key} className="rounded-xl border border-cream-200 bg-white p-3">
                  <div className="flex items-start gap-2">
                    <label className="block min-w-0 flex-1">
                      <span className="sr-only">Producto</span>
                      <select value={line.productId} onChange={(e) => setLine(line.key, { productId: e.target.value })} className={`${field} mt-0`}>
                        <option value="">{products.length ? 'Elige un producto…' : 'Cargando inventario…'}</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · {p.brand}
                            {p.active ? '' : ' (oculto en la tienda)'}
                          </option>
                        ))}
                      </select>
                    </label>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                        aria-label="Quitar producto"
                        className="mt-1 rounded-lg px-2 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  {product && (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {needsColor && (
                        <label className="block">
                          <span className={caption}>Color</span>
                          <select value={line.color} onChange={(e) => setLine(line.key, { color: e.target.value })} className={field}>
                            <option value="">—</option>
                            {product.colors.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <label className="block">
                        <span className={caption}>Talla</span>
                        <select
                          value={line.size}
                          onChange={(e) => setLine(line.key, { size: e.target.value, quantity: 1 })}
                          disabled={needsColor && !line.color}
                          className={`${field} disabled:opacity-50`}
                        >
                          <option value="">—</option>
                          {product.sizes.map((s) => {
                            const units = available(product, s, line.color);
                            return (
                              <option key={s} value={s} disabled={units < 1}>
                                {s} · {units < 1 ? 'agotada' : `${units} disp.`}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                      <label className="block">
                        <span className={caption}>Cantidad</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={left ?? undefined}
                          value={line.quantity}
                          onChange={(e) => setLine(line.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                          className={field}
                        />
                      </label>
                      <label className="block">
                        <span className={caption}>Precio c/u ($)</span>
                        <input
                          value={line.price}
                          onChange={(e) => setLine(line.key, { price: e.target.value.replace(/\D/g, '') })}
                          inputMode="numeric"
                          className={field}
                        />
                      </label>
                    </div>
                  )}
                  {left !== null && line.quantity > left && (
                    <p className="mt-2 text-xs text-red-700">Solo quedan {left} unidades de esta talla.</p>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
              className="text-sm font-medium text-coffee-800 underline underline-offset-4"
            >
              + Agregar otro producto
            </button>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold text-coffee-900">Pago</legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Pago">
              {(
                [
                  ['COD', 'Contra entrega'],
                  ['TRANSFER', 'Ya pagó'],
                  ['CREDIT', 'Fiado'],
                ] as const
              ).map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === value}
                  onClick={() => setPaymentMethod(value)}
                  className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    paymentMethod === value
                      ? 'border-coffee-900 bg-coffee-900 font-medium text-cream-50'
                      : 'border-cream-200 bg-white text-coffee-700 hover:bg-cream-100'
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
            {paymentMethod === 'CREDIT' && (
              <p className="text-xs text-coffee-600">
                Se entrega ahora y lo paga después. Los abonos se registran en Cuentas › Fiados.
              </p>
            )}
            <label className="block">
              <span className={caption}>Envío cobrado en el pedido ($) — déjalo vacío si el cliente lo paga al recibir</span>
              <input value={shipping} onChange={(e) => setShipping(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="0" className={field} />
            </label>
          </fieldset>
        </div>

        <div className="border-t border-cream-200 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="mb-3 flex items-baseline justify-between text-sm">
            <span className="text-coffee-600">
              Total{shippingCents === 0 ? <span className="text-coffee-500"> (+ envío al recibir)</span> : ''}
            </span>
            <span className="text-lg font-semibold tabular-nums text-coffee-900">{formatCOP(subtotalCents + shippingCents)}</span>
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
            {saving ? 'Registrando…' : 'Registrar pedido y descontar inventario'}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { COLOMBIA_DEPARTMENTS } from '@/lib/colombia';
import ShippingLabel, { type LabelData, type LabelSize, type Sender } from '@/components/admin/ShippingLabel';

type Order = {
  id: string;
  customerName: string;
  customerDocument: string | null;
  shippingAddress: string;
  shippingAddressComplement: string | null;
  shippingDepartment: string | null;
  shippingCity: string;
  shippingPhone: string;
  deliveryNotes: string | null;
  wompiReference: string;
  totalCents: number;
  status: string;
  paymentMethod: 'WOMPI' | 'COD';
  trackingNumber: string | null;
  items: { quantity: number; size: string; color: string | null; product: { name: string } }[];
};

const EMPTY: LabelData = {
  name: '',
  document: '',
  phone: '',
  address: '',
  complement: '',
  city: '',
  department: '',
  notes: '',
  content: '',
  pieces: '1',
  reference: '',
  trackingNumber: '',
  cod: true,
  amount: '',
  declaredValue: '',
};

function fromOrder(order: Order): LabelData {
  const pieces = order.items.reduce((n, i) => n + i.quantity, 0);
  const pesos = String(Math.round(order.totalCents / 100));
  return {
    name: order.customerName,
    document: order.customerDocument ?? '',
    phone: order.shippingPhone,
    address: order.shippingAddress,
    complement: order.shippingAddressComplement ?? '',
    city: order.shippingCity,
    department: order.shippingDepartment ?? '',
    notes: order.deliveryNotes ?? '',
    content: order.items
      .map((i) => `${i.quantity}× ${i.product.name} (${[i.size, i.color].filter(Boolean).join(', ')})`)
      .join(', '),
    pieces: String(pieces),
    reference: order.wompiReference,
    trackingNumber: order.trackingNumber ?? '',
    cod: order.paymentMethod === 'COD',
    amount: order.paymentMethod === 'COD' ? pesos : '',
    declaredValue: pesos,
  };
}

/** Reference for a label made by hand, e.g. AFRA-251025-4821. */
function manualReference() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `AFRA-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
}

const field =
  'mt-1 w-full rounded-lg border border-cream-200 bg-white px-3 py-2.5 text-base text-coffee-900 outline-none transition-colors focus:border-coffee-600 sm:text-sm';
const caption = 'text-xs font-medium text-coffee-700';

export default function VoucherCreator({ sender }: { sender: Sender }) {
  const params = useSearchParams();
  const [data, setData] = useState<LabelData>(EMPTY);
  const [size, setSize] = useState<LabelSize>('etiqueta');
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderId, setOrderId] = useState(params.get('pedido') ?? '');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/orders')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Order[]) => setOrders(list.filter((o) => o.status !== 'CANCELLED')))
      .catch(() => {});
  }, []);

  // Prefill once the order list arrives, or when another order is picked.
  useEffect(() => {
    if (!orderId) return;
    const order = orders.find((o) => o.id === orderId);
    if (order) setData(fromOrder(order));
  }, [orderId, orders]);

  const set = <K extends keyof LabelData>(key: K, value: LabelData[K]) => setData((d) => ({ ...d, [key]: value }));

  const print = () => {
    if (!data.reference) set('reference', manualReference());
    // Let React paint the reference before the print dialog snapshots the page.
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };

  const reset = () => {
    setOrderId('');
    setData(EMPTY);
  };

  const canPrint = data.name.trim() && data.phone.trim() && data.address.trim() && data.city.trim();

  return (
    <div>
      <style>{`
        @page { size: ${size === 'etiqueta' ? '100mm 150mm' : 'letter'}; margin: ${size === 'etiqueta' ? '0' : '12mm'}; }
        #label-print-root { display: none; }
        @media print {
          body > *:not(#label-print-root) { display: none !important; }
          #label-print-root { display: block; }
          html, body { background: #fff !important; }
          #label-print-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900">Bouchers de envío</h1>
          <p className="mt-1 text-sm text-coffee-600">
            Arma la guía para pegar en el paquete. Cárgala desde un pedido o escríbela a mano.
          </p>
        </div>
        <div className="flex rounded-lg border border-cream-200 bg-white p-1 text-sm" role="radiogroup" aria-label="Tamaño">
          {(
            [
              ['etiqueta', 'Etiqueta 10×15 cm'],
              ['carta', 'Hoja carta'],
            ] as [LabelSize, string][]
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={size === value}
              onClick={() => setSize(value)}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                size === value ? 'bg-coffee-900 font-medium text-cream-50' : 'text-coffee-700 hover:bg-cream-100'
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,26rem)_1fr]">
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (canPrint) print();
          }}
        >
          <section className="rounded-2xl border border-cream-200 bg-white p-4">
            <label className="block">
              <span className={caption}>Cargar desde un pedido</span>
              <select value={orderId} onChange={(e) => setOrderId(e.target.value)} className={field}>
                <option value="">— Escribir a mano —</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.customerName} · {o.shippingCity} · {o.wompiReference.slice(-8)}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold text-coffee-900">Destinatario</legend>
            <label className="block">
              <span className={caption}>Nombre completo *</span>
              <input value={data.name} onChange={(e) => set('name', e.target.value)} required autoComplete="off" className={field} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={caption}>Cédula</span>
                <input value={data.document} onChange={(e) => set('document', e.target.value)} inputMode="numeric" className={field} />
              </label>
              <label className="block">
                <span className={caption}>Celular *</span>
                <input value={data.phone} onChange={(e) => set('phone', e.target.value)} required type="tel" inputMode="tel" className={field} />
              </label>
            </div>
            <label className="block">
              <span className={caption}>Dirección *</span>
              <input value={data.address} onChange={(e) => set('address', e.target.value)} required placeholder="Calle 10 # 20-30" className={field} />
            </label>
            <label className="block">
              <span className={caption}>Apto, torre, barrio</span>
              <input value={data.complement} onChange={(e) => set('complement', e.target.value)} className={field} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={caption}>Ciudad *</span>
                <input value={data.city} onChange={(e) => set('city', e.target.value)} required className={field} />
              </label>
              <label className="block">
                <span className={caption}>Departamento</span>
                <select value={data.department} onChange={(e) => set('department', e.target.value)} className={field}>
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
              <span className={caption}>Indicaciones de entrega</span>
              <input value={data.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Portería, horario…" className={field} />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold text-coffee-900">Paquete</legend>
            <label className="block">
              <span className={caption}>Contenido</span>
              <input value={data.content} onChange={(e) => set('content', e.target.value)} placeholder="Prendas de vestir" className={field} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={caption}>Piezas</span>
                <input value={data.pieces} onChange={(e) => set('pieces', e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={field} />
              </label>
              <label className="block">
                <span className={caption}>Valor declarado ($)</span>
                <input
                  value={data.declaredValue}
                  onChange={(e) => set('declaredValue', e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  className={field}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={caption}>Referencia</span>
                <input value={data.reference} onChange={(e) => set('reference', e.target.value)} placeholder="Automática" className={field} />
              </label>
              <label className="block">
                <span className={caption}>N.º guía transportadora</span>
                <input value={data.trackingNumber} onChange={(e) => set('trackingNumber', e.target.value)} className={field} />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold text-coffee-900">Cobro</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Cobro">
              {[
                [true, 'Contra entrega'],
                [false, 'Ya pagado'],
              ].map(([value, text]) => (
                <button
                  key={String(value)}
                  type="button"
                  role="radio"
                  aria-checked={data.cod === value}
                  onClick={() => set('cod', value as boolean)}
                  className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    data.cod === value
                      ? 'border-coffee-900 bg-coffee-900 font-medium text-cream-50'
                      : 'border-cream-200 bg-white text-coffee-700 hover:bg-cream-100'
                  }`}
                >
                  {text as string}
                </button>
              ))}
            </div>
            {data.cod && (
              <label className="block">
                <span className={caption}>Valor a cobrar ($) *</span>
                <input
                  value={data.amount}
                  onChange={(e) => set('amount', e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  required
                  placeholder="Incluye el envío"
                  className={field}
                />
              </label>
            )}
          </fieldset>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!canPrint || (data.cod && !data.amount)}
              className="flex-1 rounded-lg bg-coffee-900 px-4 py-3 text-sm font-medium text-cream-50 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Imprimir boucher
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-cream-200 px-4 py-3 text-sm text-coffee-700 transition-colors hover:bg-cream-100"
            >
              Limpiar
            </button>
          </div>
          <p className="text-xs text-coffee-500">
            En el diálogo de impresión elige escala 100 % (tamaño real). Para etiquetas térmicas selecciona el papel de 10×15
            cm. Los datos del remitente salen de Contenido web › Datos legales.
          </p>
        </form>

        <div className="min-w-0">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-coffee-500">Vista previa</p>
          <div className="overflow-x-auto rounded-2xl bg-cream-100 p-4 sm:p-8">
            <div className="mx-auto w-fit shadow-[0_12px_32px_-16px_rgba(54,37,25,0.35)]">
              <ShippingLabel data={data} sender={sender} size={size} />
            </div>
          </div>
        </div>
      </div>

      {mounted &&
        createPortal(
          <div id="label-print-root">
            <ShippingLabel data={data} sender={sender} size={size} />
          </div>,
          document.body
        )}
    </div>
  );
}

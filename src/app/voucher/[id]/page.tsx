'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatCOP } from '@/lib/format';

type OrderItem = {
  id: string;
  size: string;
  color: string | null;
  quantity: number;
  product: { name: string };
};

type Order = {
  id: string;
  customerName: string;
  customerDocument: string | null;
  customerEmail: string;
  shippingAddress: string;
  shippingAddressComplement: string | null;
  shippingDepartment: string | null;
  shippingCity: string;
  shippingPhone: string;
  deliveryNotes: string | null;
  wompiReference: string;
  totalCents: number;
  paymentMethod: 'WOMPI' | 'COD';
  items: OrderItem[];
};

export default function VoucherPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setOrder)
      .catch(() => setError(true));
  }, [params.id]);

  if (error) {
    return <p className="p-8 text-center text-sm text-coffee-600">No se pudo cargar el pedido.</p>;
  }
  if (!order) {
    return <p className="p-8 text-center text-sm text-coffee-600">Cargando…</p>;
  }

  return (
    <div className="min-h-screen bg-cream-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-xl justify-end gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-full bg-coffee-900 px-6 py-2.5 text-sm font-medium text-cream-50 transition-colors hover:bg-coffee-800"
        >
          Imprimir boucher
        </button>
      </div>

      <div className="mx-auto max-w-xl rounded-2xl border-2 border-dashed border-coffee-900 bg-cream-50 p-8 print:rounded-none print:border-4 print:border-solid">
        <div className="flex items-center justify-between border-b-2 border-coffee-900 pb-4">
          <p className="text-2xl font-semibold tracking-tightest text-coffee-900">AFRA°</p>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-coffee-500">Guía de envío</p>
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-coffee-500">Destinatario</p>
          <p className="mt-1 text-2xl font-semibold text-coffee-900">{order.customerName}</p>
          {order.customerDocument && (
            <p className="mt-1 text-base text-coffee-700">C.C. {order.customerDocument}</p>
          )}
          <p className="mt-1 text-base text-coffee-700">Tel: {order.shippingPhone}</p>
        </div>

        <div className="mt-6 border-t-2 border-coffee-900 pt-6">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-coffee-500">Dirección de entrega</p>
          <p className="mt-1 text-xl font-semibold leading-snug text-coffee-900">
            {order.shippingAddress}
            {order.shippingAddressComplement && `, ${order.shippingAddressComplement}`}
          </p>
          <p className="mt-1 text-lg font-medium text-coffee-800">
            {order.shippingCity}
            {order.shippingDepartment && `, ${order.shippingDepartment}`}
          </p>
        </div>

        {order.deliveryNotes && (
          <div className="mt-6 rounded-xl bg-cream-100 p-4 text-sm text-coffee-700 print:border print:border-coffee-300 print:bg-white">
            <strong className="font-medium text-coffee-900">Nota de entrega:</strong> {order.deliveryNotes}
          </div>
        )}

        <div className="mt-6 border-t-2 border-coffee-900 pt-4 text-sm text-coffee-600">
          <p>Pedido: {order.wompiReference}</p>
          <p>
            {order.items.reduce((sum, i) => sum + i.quantity, 0)} pieza(s) ·{' '}
            {order.paymentMethod === 'COD' ? `Cobrar ${formatCOP(order.totalCents)} contra entrega` : formatCOP(order.totalCents)}
          </p>
          <p className="mt-1 font-medium text-coffee-800">
            {order.paymentMethod === 'COD' ? 'Pago contra entrega' : 'Pagado en línea (Wompi)'}
          </p>
        </div>
      </div>
    </div>
  );
}

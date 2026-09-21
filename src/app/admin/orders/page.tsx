'use client';

import { useEffect, useState } from 'react';
import { formatCOP } from '@/lib/format';

type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'CANCELLED';
  totalCents: number;
  trackingNumber: string | null;
  carrier: string;
  wompiReference: string;
  createdAt: string;
};

const STATUS_LABEL: Record<Order['status'], string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  SHIPPED: 'Enviado',
  CANCELLED: 'Cancelado',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch('/api/orders');
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleShip = async (orderId: string) => {
    const trackingNumber = tracking[orderId];
    if (!trackingNumber) return;
    const res = await fetch(`/api/orders/${orderId}/shipping`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingNumber, carrier: 'Inter Rapidísimo' }),
    });
    if (res.ok) load();
  };

  if (loading) return <p className="text-coffee-600">Cargando…</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900 mb-6">Pedidos</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border border-cream-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-coffee-900">{order.customerName}</p>
              <p className="text-sm text-coffee-600">{order.customerEmail}</p>
              <p className="text-xs text-coffee-500">{order.wompiReference}</p>
            </div>
            <div className="text-sm font-medium text-coffee-800">{formatCOP(order.totalCents)}</div>
            <span
              className={`text-xs px-3 py-1 rounded-full ${
                order.status === 'PAID'
                  ? 'bg-yellow-100 text-yellow-800'
                  : order.status === 'SHIPPED'
                  ? 'bg-green-100 text-green-800'
                  : order.status === 'CANCELLED'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-cream-200 text-coffee-700'
              }`}
            >
              {STATUS_LABEL[order.status]}
            </span>
            {order.status === 'PAID' && (
              <div className="flex gap-2">
                <input
                  placeholder="Guía Inter Rapidísimo"
                  value={tracking[order.id] ?? ''}
                  onChange={(e) => setTracking({ ...tracking, [order.id]: e.target.value })}
                  className="border border-cream-200 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={() => handleShip(order.id)}
                  className="bg-coffee-900 text-cream-50 px-4 py-2 rounded-lg text-sm"
                >
                  Marcar enviado
                </button>
              </div>
            )}
            {order.status === 'SHIPPED' && order.trackingNumber && (
              <p className="text-xs text-coffee-600">Guía: {order.trackingNumber}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

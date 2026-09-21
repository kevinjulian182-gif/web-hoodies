'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCOP } from '@/lib/format';
import { buildOrderConfirmationMessage, buildWhatsAppLink } from '@/lib/whatsapp';

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
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'CANCELLED';
  paymentMethod: 'WOMPI' | 'COD';
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

const PAYMENT_LABEL: Record<Order['paymentMethod'], string> = {
  WOMPI: 'Wompi',
  COD: 'Contra entrega',
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

  const handleDelete = async (order: Order) => {
    if (!confirm(`¿Eliminar el pedido de ${order.customerName} (${order.wompiReference})? Esta acción no se puede deshacer.`)) {
      return;
    }
    const res = await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  if (loading) return <p className="text-coffee-600">Cargando…</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900 mb-6">Pedidos</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border border-cream-200 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-coffee-900">{order.customerName}</p>
                <p className="text-sm text-coffee-600">{order.customerEmail}</p>
                <p className="text-xs text-coffee-500">{order.wompiReference}</p>
                <p className="mt-1.5 text-xs text-coffee-600">
                  {order.shippingAddress}
                  {order.shippingAddressComplement && `, ${order.shippingAddressComplement}`} —{' '}
                  {order.shippingCity}
                  {order.shippingDepartment && `, ${order.shippingDepartment}`} · {order.shippingPhone}
                </p>
                {order.deliveryNotes && (
                  <p className="mt-1 text-xs italic text-amber-700">Nota: {order.deliveryNotes}</p>
                )}
              </div>
              <div className="text-sm font-medium text-coffee-800">{formatCOP(order.totalCents)}</div>
              <div className="flex items-center gap-1.5">
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
                <span
                  className={`text-xs px-3 py-1 rounded-full ${
                    order.paymentMethod === 'COD' ? 'bg-amber-50 text-amber-700' : 'bg-cream-200 text-coffee-700'
                  }`}
                >
                  {PAYMENT_LABEL[order.paymentMethod]}
                </span>
              </div>
              {(order.status === 'PAID' || (order.paymentMethod === 'COD' && order.status === 'PENDING')) && (
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

            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-cream-200 pt-3">
              <a
                href={buildWhatsAppLink(order.shippingPhone, buildOrderConfirmationMessage(order))}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#128C7E] transition-colors hover:text-[#0e6b60]"
              >
                Enviar confirmación por WhatsApp
              </a>
              <Link
                href={`/voucher/${order.id}`}
                target="_blank"
                className="text-sm text-coffee-700 transition-colors hover:text-coffee-900"
              >
                Generar boucher
              </Link>
              <button
                onClick={() => handleDelete(order)}
                className="text-sm text-red-600 transition-colors hover:text-red-800"
              >
                Eliminar pedido
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

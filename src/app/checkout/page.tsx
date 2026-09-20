'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { formatCOP } from '@/lib/format';
import WompiCheckoutButton from '@/components/WompiCheckoutButton';

type CheckoutData = {
  orderId: string;
  reference: string;
  amountInCents: number;
  currency: string;
  signature: string;
  publicKey: string;
};

export default function CheckoutPage() {
  const { items, subtotalCents } = useCart();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    customerEmail: '',
    customerName: '',
    shippingAddress: '',
    shippingCity: '',
    shippingPhone: '',
    couponCode: '',
  });
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/checkout/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          couponCode: form.couponCode || undefined,
          items: items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.formErrors?.[0] ?? data.error ?? 'No se pudo iniciar el pago');
        return;
      }
      setCheckoutData(data);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !checkoutData) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-coffee-700">Tu carrito está vacío.</p>
        <Link href="/productos" className="text-coffee-900 underline">
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center text-lg font-semibold tracking-tightest text-coffee-900 mb-10">
          AFRA°
        </Link>

        <div className="mb-8 space-y-2">
          {items.map((item) => (
            <div key={`${item.productId}-${item.size}`} className="flex justify-between text-sm text-coffee-700">
              <span>
                {item.name} · {item.size} × {item.quantity}
              </span>
              <span>{formatCOP(item.priceCents * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between font-semibold text-coffee-900 pt-2 border-t border-cream-200">
            <span>Total</span>
            <span>{formatCOP(checkoutData?.amountInCents ?? subtotalCents)}</span>
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              required
              placeholder="Nombre completo"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
            />
            <input
              required
              type="email"
              placeholder="Correo electrónico"
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
              className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
            />
            <input
              required
              placeholder="Dirección de envío"
              value={form.shippingAddress}
              onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
              className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
            />
            <div className="flex gap-3">
              <input
                required
                placeholder="Ciudad"
                value={form.shippingCity}
                onChange={(e) => setForm({ ...form, shippingCity: e.target.value })}
                className="w-1/2 border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
              />
              <input
                required
                placeholder="Teléfono"
                value={form.shippingPhone}
                onChange={(e) => setForm({ ...form, shippingPhone: e.target.value })}
                className="w-1/2 border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
              />
            </div>
            <input
              placeholder="Cupón de descuento (opcional)"
              value={form.couponCode}
              onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
              className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-coffee-900 text-cream-50 py-4 rounded-full text-sm font-medium tracking-wide disabled:opacity-50"
            >
              {loading ? 'Procesando…' : 'Continuar al pago'}
            </button>
          </form>
        )}

        {step === 2 && checkoutData && (
          <div className="space-y-4">
            <p className="text-sm text-coffee-600 text-center">
              Serás dirigido a Wompi para completar tu pago de forma segura.
            </p>
            <WompiCheckoutButton
              publicKey={checkoutData.publicKey}
              currency={checkoutData.currency}
              amountInCents={checkoutData.amountInCents}
              reference={checkoutData.reference}
              signature={checkoutData.signature}
              redirectUrl={`${window.location.origin}/checkout/success?ref=${checkoutData.reference}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

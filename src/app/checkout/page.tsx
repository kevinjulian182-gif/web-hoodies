'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

type FieldErrors = Record<string, string[] | undefined>;

function extractError(error: unknown): string {
  if (!error) return 'No se pudo iniciar el pago. Intenta de nuevo.';
  if (typeof error === 'string') return error;
  const fieldErrors = (error as { fieldErrors?: FieldErrors }).fieldErrors;
  const firstFieldError = fieldErrors && Object.values(fieldErrors).flat().find(Boolean);
  if (firstFieldError) return firstFieldError;
  const formErrors = (error as { formErrors?: string[] }).formErrors;
  if (formErrors?.[0]) return formErrors[0];
  return 'No se pudo iniciar el pago. Intenta de nuevo.';
}

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
          items: items.map((i) => ({ productId: i.productId, size: i.size, color: i.color, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(extractError(data.error));
        return;
      }
      setCheckoutData(data);
      setStep(2);
    } catch {
      setError('No se pudo conectar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !checkoutData) {
    return (
      <div className="min-h-dvh flex items-center justify-center flex-col gap-4">
        <p className="text-coffee-700">Tu carrito está vacío.</p>
        <Link
          href="/productos"
          className="rounded-full bg-coffee-900 px-6 py-3 text-sm font-medium text-cream-50 transition-colors hover:bg-coffee-800"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream-50 px-6 py-12 md:py-16">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="block text-center text-lg font-semibold tracking-tightest text-coffee-900 mb-8">
          AFRA°
        </Link>

        <div className="mx-auto mb-10 flex max-w-xs items-center justify-center gap-3">
          <StepDot n={1} label="Envío" active={step === 1} done={step === 2} />
          <span className={`h-px w-10 ${step === 2 ? 'bg-coffee-900' : 'bg-cream-300'}`} />
          <StepDot n={2} label="Pago" active={step === 2} done={false} />
        </div>

        <div className="grid gap-8 md:grid-cols-[1fr_360px] md:items-start">
          <div className="order-2 md:order-1">
            {step === 1 && (
              <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-cream-200 p-6 md:p-8">
                <Field label="Nombre completo">
                  <input
                    required
                    placeholder="Como aparece en tu documento"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
                  />
                </Field>
                <Field label="Correo electrónico">
                  <input
                    required
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    value={form.customerEmail}
                    onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                    className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
                  />
                </Field>
                <Field label="Dirección de envío">
                  <input
                    required
                    placeholder="Calle, número, apartamento"
                    value={form.shippingAddress}
                    onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                    className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
                  />
                </Field>
                <div className="flex gap-3">
                  <Field label="Ciudad" className="w-1/2">
                    <input
                      required
                      placeholder="Bogotá"
                      value={form.shippingCity}
                      onChange={(e) => setForm({ ...form, shippingCity: e.target.value })}
                      className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
                    />
                  </Field>
                  <Field label="Teléfono" className="w-1/2">
                    <input
                      required
                      type="tel"
                      minLength={7}
                      placeholder="300 123 4567"
                      value={form.shippingPhone}
                      onChange={(e) => setForm({ ...form, shippingPhone: e.target.value })}
                      className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
                    />
                  </Field>
                </div>
                <Field label="Cupón de descuento (opcional)">
                  <input
                    placeholder="Código"
                    value={form.couponCode}
                    onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
                    className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
                  />
                </Field>
                {error && (
                  <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-coffee-900 text-cream-50 py-4 rounded-full text-sm font-medium tracking-wide transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? 'Procesando…' : 'Continuar al pago'}
                </button>
              </form>
            )}

            {step === 2 && checkoutData && (
              <div className="space-y-6 rounded-2xl border border-cream-200 p-6 md:p-8">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-coffee-600 transition-colors hover:text-coffee-900"
                >
                  ← Editar datos de envío
                </button>
                <div className="text-center">
                  <p className="text-sm text-coffee-600">
                    Serás dirigido a Wompi para completar tu pago de forma segura.
                  </p>
                  <div className="mt-6">
                    <WompiCheckoutButton
                      publicKey={checkoutData.publicKey}
                      currency={checkoutData.currency}
                      amountInCents={checkoutData.amountInCents}
                      reference={checkoutData.reference}
                      signature={checkoutData.signature}
                      redirectUrl={`${window.location.origin}/checkout/success?ref=${checkoutData.reference}`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="order-1 md:order-2 rounded-2xl border border-cream-200 p-6 md:sticky md:top-16">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-coffee-600">Tu pedido</p>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={`${item.productId}-${item.size}-${item.color ?? ''}`} className="flex items-center gap-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-cream-100">
                    {item.image && (
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                    )}
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-coffee-900 text-[10px] font-medium text-cream-50">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-coffee-900">{item.name}</p>
                    <p className="text-xs text-coffee-500">
                      {item.size}
                      {item.color ? ` · ${item.color}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-coffee-700">{formatCOP(item.priceCents * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2 border-t border-cream-200 pt-4 text-sm">
              <div className="flex justify-between text-coffee-600">
                <span>Subtotal</span>
                <span>{formatCOP(subtotalCents)}</span>
              </div>
              {checkoutData && checkoutData.amountInCents < subtotalCents && (
                <div className="flex justify-between text-coffee-600">
                  <span>Descuento</span>
                  <span>-{formatCOP(subtotalCents - checkoutData.amountInCents)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-cream-200 pt-2 text-base font-semibold text-coffee-900">
                <span>Total</span>
                <span>{formatCOP(checkoutData?.amountInCents ?? subtotalCents)}</span>
              </div>
            </div>

            <ul className="mt-6 space-y-2.5 border-t border-cream-200 pt-4 text-xs text-coffee-600">
              <li className="flex items-center gap-2">
                <LockIcon /> Pago 100% seguro con Wompi
              </li>
              <li className="flex items-center gap-2">
                <TruckIcon /> Envíos a toda Colombia
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon /> Piezas 100% originales
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-coffee-600">{label}</span>
      {children}
    </label>
  );
}

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
          active || done ? 'bg-coffee-900 text-cream-50' : 'bg-cream-200 text-coffee-500'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <span className={`text-xs font-medium uppercase tracking-wide ${active ? 'text-coffee-900' : 'text-coffee-500'}`}>
        {label}
      </span>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 8h11v8H2z" strokeLinejoin="round" />
      <path d="M13 11h4l3 3v2h-7z" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

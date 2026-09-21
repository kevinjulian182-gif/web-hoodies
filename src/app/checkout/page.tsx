'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useCart } from '@/lib/cart';
import { formatCOP } from '@/lib/format';
import { COLOMBIA_DEPARTMENTS } from '@/lib/colombia';
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

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: 'Contacto',
  2: 'Envío',
  3: 'Detalles',
  4: 'Pago',
};

export default function CheckoutPage() {
  const { items, subtotalCents } = useCart();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    customerEmail: '',
    customerName: '',
    shippingAddress: '',
    shippingAddressComplement: '',
    shippingDepartment: '',
    shippingCity: '',
    shippingPhone: '',
    deliveryNotes: '',
    couponCode: '',
  });
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const goToNextStep = (e: React.FormEvent, next: Step) => {
    e.preventDefault();
    setError('');
    setStep(next);
  };

  const handleInitCheckout = async (e: React.FormEvent) => {
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
      setStep(4);
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

        <div className="mx-auto mb-10 flex max-w-sm items-center justify-center">
          {([1, 2, 3, 4] as Step[]).map((n, i) => (
            <div key={n} className={i > 0 ? 'flex flex-1 items-center' : 'flex items-center'}>
              {i > 0 && <span className={`h-px flex-1 ${step > n - 1 ? 'bg-coffee-900' : 'bg-cream-300'}`} />}
              <StepDot
                n={n}
                label={STEP_LABELS[n]}
                active={step === n}
                done={step > n}
                clickable={n < step}
                onClick={() => n < step && setStep(n)}
              />
            </div>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-[1fr_360px] md:items-start">
          <div className="order-2 md:order-1">
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={(e) => goToNextStep(e, 2)}
                className="space-y-8 rounded-2xl border border-cream-200 p-6 md:p-8"
              >
                <FormSection icon={<UserIcon />} title="Contacto">
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
                </FormSection>

                <button
                  type="submit"
                  className="w-full bg-coffee-900 text-cream-50 py-4 rounded-full text-sm font-medium tracking-wide transition-all hover:bg-coffee-800 active:scale-[0.99]"
                >
                  Continuar a dirección de envío
                </button>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={(e) => goToNextStep(e, 3)}
                className="space-y-8 rounded-2xl border border-cream-200 p-6 md:p-8"
              >
                <FormSection icon={<PinIcon />} title="Dirección de envío">
                  <Field label="Dirección">
                    <input
                      required
                      placeholder="Calle, número"
                      value={form.shippingAddress}
                      onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                      className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
                    />
                  </Field>
                  <Field label="Apartamento, torre, complemento (opcional)">
                    <input
                      placeholder="Apto 501, torre 2, portería…"
                      value={form.shippingAddressComplement}
                      onChange={(e) => setForm({ ...form, shippingAddressComplement: e.target.value })}
                      className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
                    />
                  </Field>
                  <div className="flex gap-3">
                    <Field label="Departamento" className="w-1/2">
                      <select
                        required
                        value={form.shippingDepartment}
                        onChange={(e) => setForm({ ...form, shippingDepartment: e.target.value })}
                        className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600 bg-white"
                      >
                        <option value="" disabled>
                          Selecciona
                        </option>
                        {COLOMBIA_DEPARTMENTS.map((dep) => (
                          <option key={dep} value={dep}>
                            {dep}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Ciudad" className="w-1/2">
                      <input
                        required
                        placeholder="Bogotá"
                        value={form.shippingCity}
                        onChange={(e) => setForm({ ...form, shippingCity: e.target.value })}
                        className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
                      />
                    </Field>
                  </div>
                  <Field label="Teléfono">
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
                </FormSection>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-full px-6 py-4 text-sm font-medium text-coffee-600 transition-colors hover:text-coffee-900"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-coffee-900 text-cream-50 py-4 rounded-full text-sm font-medium tracking-wide transition-all hover:bg-coffee-800 active:scale-[0.99]"
                  >
                    Continuar a detalles de entrega
                  </button>
                </div>
              </motion.form>
            )}

            {step === 3 && (
              <motion.form
                key="step3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleInitCheckout}
                className="space-y-8 rounded-2xl border border-cream-200 p-6 md:p-8"
              >
                <FormSection icon={<NoteIcon />} title="Detalles de entrega">
                  <Field label="Comentarios para la entrega (opcional)">
                    <textarea
                      rows={3}
                      placeholder="Ej: dejar con el celador, no hay timbre, llamar al llegar…"
                      value={form.deliveryNotes}
                      onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })}
                      className="w-full resize-none border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
                    />
                  </Field>
                  <Field label="Cupón de descuento (opcional)">
                    <input
                      placeholder="Código"
                      value={form.couponCode}
                      onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
                      className="w-full border border-cream-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-coffee-600"
                    />
                  </Field>
                </FormSection>

                {error && (
                  <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-full px-6 py-4 text-sm font-medium text-coffee-600 transition-colors hover:text-coffee-900"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-coffee-900 text-cream-50 py-4 rounded-full text-sm font-medium tracking-wide transition-all hover:bg-coffee-800 active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? 'Procesando…' : 'Continuar al pago'}
                  </button>
                </div>
              </motion.form>
            )}

            {step === 4 && checkoutData && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6 rounded-2xl border border-cream-200 p-6 md:p-8"
              >
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-sm text-coffee-600 transition-colors hover:text-coffee-900"
                >
                  ← Editar datos de entrega
                </button>

                <div className="rounded-xl bg-cream-100 p-5 text-sm text-coffee-700">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-coffee-500">
                    Enviaremos estos datos a Wompi
                  </p>
                  <p className="font-medium text-coffee-900">{form.customerName}</p>
                  <p>{form.customerEmail}</p>
                  <p>
                    {form.shippingAddress}
                    {form.shippingAddressComplement && `, ${form.shippingAddressComplement}`}
                  </p>
                  <p>
                    {form.shippingCity}
                    {form.shippingDepartment && `, ${form.shippingDepartment}`} · {form.shippingPhone}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-coffee-600">
                    Serás dirigido a Wompi para completar tu pago de forma segura. No tendrás que
                    volver a escribir tus datos.
                  </p>
                  <div className="mt-6">
                    <WompiCheckoutButton
                      publicKey={checkoutData.publicKey}
                      currency={checkoutData.currency}
                      amountInCents={checkoutData.amountInCents}
                      reference={checkoutData.reference}
                      signature={checkoutData.signature}
                      redirectUrl={`${window.location.origin}/checkout/success?ref=${checkoutData.reference}`}
                      customer={{
                        fullName: form.customerName,
                        email: form.customerEmail,
                        phoneNumber: form.shippingPhone,
                      }}
                      shippingAddress={{
                        addressLine1: form.shippingAddress,
                        addressLine2: form.shippingAddressComplement || undefined,
                        city: form.shippingCity,
                        region: form.shippingDepartment,
                        phoneNumber: form.shippingPhone,
                        name: form.customerName,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
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

function FormSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-coffee-500">
        <span className="text-coffee-400">{icon}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-4 5-5.5 7-5.5s5.5 1.5 7 5.5" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-7-6.3-7-11.5A7 7 0 0 1 19 9.5C19 14.7 12 21 12 21Z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

function StepDot({
  n,
  label,
  active,
  done,
  clickable,
  onClick,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
  clickable: boolean;
  onClick: () => void;
}) {
  const content = (
    <>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${
          active || done ? 'bg-coffee-900 text-cream-50' : 'bg-cream-200 text-coffee-500'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <span
        className={`hidden text-xs font-medium uppercase tracking-wide sm:inline ${
          active ? 'text-coffee-900' : 'text-coffee-500'
        }`}
      >
        {label}
      </span>
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-70"
      >
        {content}
      </button>
    );
  }

  return <div className="flex shrink-0 items-center gap-2">{content}</div>;
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

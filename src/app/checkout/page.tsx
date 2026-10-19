'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '@/lib/cart';
import { useCatalogSettings } from '@/lib/catalogSettings';
import { formatCOP } from '@/lib/format';
import { computeDiscountCents, computeShippingCents, type CouponTerms } from '@/lib/pricing';
import { COLOMBIA_DEPARTMENTS } from '@/lib/colombia';
import WompiCheckoutButton from '@/components/WompiCheckoutButton';
import Logo from '@/components/Logo';
import { autoBulletize, pasteBulletedText } from '@/lib/textareaBullets';

type CheckoutData = {
  orderId: string;
  reference: string;
  amountInCents: number;
  currency: string;
  signature: string;
  publicKey: string;
};

type PaymentMethod = 'WOMPI' | 'COD';
type FieldErrors = Record<string, string[] | undefined>;
type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string; title: string; subtitle: string }[] = [
  { n: 1, label: 'Tus datos', title: '¿Quién recibe el pedido?', subtitle: 'Te escribimos solo para avisarte del envío.' },
  { n: 2, label: 'Entrega', title: '¿A dónde lo enviamos?', subtitle: 'Despachamos a toda Colombia.' },
  { n: 3, label: 'Pago', title: 'Revisa y paga', subtitle: 'Último paso. Elige cómo prefieres pagar.' },
];

const EASE = [0.16, 1, 0.3, 1] as const;
const STORAGE_KEY = 'afra-checkout-v1';

const EMPTY_FORM = {
  customerName: '',
  customerEmail: '',
  customerDocument: '',
  shippingPhone: '',
  shippingAddress: '',
  shippingAddressComplement: '',
  shippingDepartment: '',
  shippingCity: '',
  deliveryNotes: '',
};
type Form = typeof EMPTY_FORM;
type FieldName = keyof Form;

const digits = (v: string) => v.replace(/\D/g, '');

// Messages shown under a field once the shopper has left it (or tried to
// continue), so nobody gets scolded while still typing.
const VALIDATORS: Partial<Record<FieldName, (v: string) => string | null>> = {
  customerName: (v) => (v.trim().length < 3 ? 'Escribe tu nombre y apellido.' : null),
  customerEmail: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : 'Revisa tu correo, parece incompleto.'),
  customerDocument: (v) => (digits(v).length < 5 || digits(v).length > 12 ? 'Escribe tu número de cédula, solo números.' : null),
  shippingPhone: (v) => (digits(v).length < 7 || digits(v).length > 15 ? 'Escribe un celular válido, ej: 300 123 4567.' : null),
  shippingAddress: (v) => (v.trim().length < 5 ? 'Escribe la dirección completa.' : null),
  shippingDepartment: (v) => (v ? null : 'Elige el departamento.'),
  shippingCity: (v) => (v.trim().length < 2 ? 'Escribe la ciudad o municipio.' : null),
};

const STEP_FIELDS: Record<1 | 2, FieldName[]> = {
  1: ['customerName', 'customerEmail', 'customerDocument', 'shippingPhone'],
  2: ['shippingAddress', 'shippingDepartment', 'shippingCity'],
};

// Common slips on Colombian shoppers' email domains; offered as a one-tap fix.
const EMAIL_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'yahoo.co': 'yahoo.com',
  'yaho.com': 'yahoo.com',
};

function suggestEmail(email: string): string | null {
  const [user, domain] = email.trim().toLowerCase().split('@');
  if (!user || !domain) return null;
  const fix = EMAIL_TYPOS[domain];
  return fix ? `${user}@${fix}` : null;
}

function extractError(error: unknown): string {
  if (!error) return 'No se pudo crear tu pedido. Intenta de nuevo.';
  if (typeof error === 'string') return error;
  const fieldErrors = (error as { fieldErrors?: FieldErrors }).fieldErrors;
  const firstFieldError = fieldErrors && Object.values(fieldErrors).flat().find(Boolean);
  if (firstFieldError) return firstFieldError;
  const formErrors = (error as { formErrors?: string[] }).formErrors;
  if (formErrors?.[0]) return formErrors[0];
  return 'No se pudo crear tu pedido. Intenta de nuevo.';
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotalCents } = useCart();
  const { freeShippingThresholdCents, shippingCostCents } = useCatalogSettings();

  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('WOMPI');
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const [coupon, setCoupon] = useState<(CouponTerms & { code: string }) | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Returning shoppers get their details back. The cédula is left out on
  // purpose: it's the one field worth not keeping on a shared device.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        setForm((f) => {
          const next = { ...f };
          for (const key of Object.keys(EMPTY_FORM) as FieldName[]) {
            if (key !== 'customerDocument' && typeof saved[key] === 'string') next[key] = saved[key];
          }
          return next;
        });
      }
    } catch {
      // storage unavailable
    }
  }, []);

  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { customerDocument, ...rest } = form;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    } catch {
      // storage unavailable
    }
  }, [form]);

  // Each step is a new screen; without this, phones stay scrolled to where
  // the previous step's button was and land mid-way through the next one.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, checkoutData]);

  const discountCents = computeDiscountCents(coupon, subtotalCents);
  const shippingCents = computeShippingCents(subtotalCents, freeShippingThresholdCents, shippingCostCents);
  const totalCents = checkoutData?.amountInCents ?? subtotalCents - discountCents + shippingCents;
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  const firstName = form.customerName.trim().split(/\s+/)[0] || '';

  const errorFor = (name: FieldName) => (touched[name] ? (VALIDATORS[name]?.(form[name]) ?? null) : null);
  const isValid = (name: FieldName) => !VALIDATORS[name]?.(form[name]);

  const fieldProps = (name: FieldName) => ({
    name,
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [name]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
    error: errorFor(name),
    valid: Boolean(touched[name] && form[name] && isValid(name)),
  });

  const goTo = (next: Step) => {
    setError('');
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const submitStep = (e: React.FormEvent<HTMLFormElement>, current: 1 | 2) => {
    e.preventDefault();
    const fields = STEP_FIELDS[current];
    setTouched((t) => ({ ...t, ...Object.fromEntries(fields.map((f) => [f, true])) }));
    const firstInvalid = fields.find((f) => !isValid(f));
    if (firstInvalid) {
      e.currentTarget.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    goTo((current + 1) as Step);
  };

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponError('');
    setCouponLoading(true);
    try {
      const res = await fetch('/api/checkout/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || 'No pudimos validar el cupón.');
        return;
      }
      setCoupon(data);
      setCouponInput('');
      setCheckoutData(null);
    } catch {
      setCouponError('No pudimos validar el cupón. Revisa tu conexión.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/checkout/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          couponCode: coupon?.code,
          paymentMethod,
          items: items.map((i) => ({ productId: i.productId, size: i.size, color: i.color, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(extractError(data.error));
        return;
      }
      if (paymentMethod === 'COD') {
        router.push(`/checkout/success?ref=${data.reference}&method=cod`);
        return;
      }
      setCheckoutData(data);
    } catch {
      setError('No se pudo conectar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Stable objects: Wompi's button re-injects its script whenever these change.
  const wompiCustomer = useMemo(
    () => ({ fullName: form.customerName, email: form.customerEmail, phoneNumber: digits(form.shippingPhone) }),
    [form.customerName, form.customerEmail, form.shippingPhone]
  );
  const wompiShipping = useMemo(
    () => ({
      addressLine1: form.shippingAddress,
      addressLine2: form.shippingAddressComplement || undefined,
      city: form.shippingCity,
      region: form.shippingDepartment,
      phoneNumber: digits(form.shippingPhone),
      name: form.customerName,
    }),
    [form]
  );

  if (items.length === 0 && !checkoutData) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-cream-50 px-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-coffee-500">
          <BagIcon />
        </span>
        <div>
          <p className="text-lg font-semibold text-coffee-900">Tu carrito está vacío</p>
          <p className="mt-1 text-sm text-coffee-600">Agrega algo que te guste y vuelve por aquí.</p>
        </div>
        <Link
          href="/productos"
          className="rounded-full bg-coffee-900 px-7 py-3.5 text-sm font-medium text-cream-50 transition-colors hover:bg-coffee-800 active:scale-[0.98]"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  const current = STEPS[step - 1];
  const slide = {
    initial: (dir: number) => ({ opacity: 0, x: dir * 28 }),
    animate: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir * -28 }),
  };

  const summary = (
    <OrderSummary
      items={items}
      subtotalCents={subtotalCents}
      discountCents={discountCents}
      couponCode={coupon?.code}
      shippingCents={shippingCents}
      totalCents={totalCents}
      thresholdCents={freeShippingThresholdCents}
    />
  );

  return (
    <div className="min-h-dvh bg-cream-50">
      <header className="border-b border-cream-200 bg-cream-50/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/productos"
            className="flex items-center gap-1 text-sm text-coffee-600 transition-colors hover:text-coffee-900"
          >
            <ChevronLeftIcon />
            <span className="hidden sm:inline">Seguir comprando</span>
          </Link>
          <Link href="/" aria-label="AFRA — inicio" className="text-coffee-900">
            <Logo className="h-5 w-auto" />
          </Link>
          <span className="flex items-center gap-1.5 text-xs font-medium text-coffee-600">
            <LockIcon />
            <span className="hidden sm:inline">Compra segura</span>
          </span>
        </div>
      </header>

      {/* Mobile: collapsible order summary, with the shipping status always in view. */}
      <div className="border-b border-cream-200 bg-cream-100/60 md:hidden">
        <button
          type="button"
          onClick={() => setSummaryOpen((o) => !o)}
          aria-expanded={summaryOpen}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-coffee-800">
            <BagIcon size={16} />
            {summaryOpen ? 'Ocultar pedido' : `Ver pedido (${itemCount})`}
            <ChevronDownIcon open={summaryOpen} />
          </span>
          <span className="text-base font-semibold tabular-nums text-coffee-900">{formatCOP(totalCents)}</span>
        </button>
        <AnimatePresence initial={false}>
          {summaryOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-5">{summary}</div>
            </motion.div>
          )}
        </AnimatePresence>
        {!summaryOpen && freeShippingThresholdCents > 0 && (
          <div className="px-4 pb-3">
            <ShippingProgress subtotalCents={subtotalCents} thresholdCents={freeShippingThresholdCents} compact />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 md:pt-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_360px] md:items-start lg:gap-12">
          <main className="min-w-0">
            <Progress step={step} onGoTo={(n) => n < step && !checkoutData && goTo(n)} />

            {!checkoutData && (
              <div className="mb-6 mt-7">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-coffee-500">
                  Paso {step} de 3
                </p>
                <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-coffee-900 sm:text-[28px]">
                  {step === 3 && firstName ? `Casi listo, ${firstName}` : current.title}
                </h1>
                <p className="mt-1 text-sm text-coffee-600">{current.subtitle}</p>
              </div>
            )}

            <AnimatePresence mode="wait" initial={false} custom={direction}>
              {step === 1 && (
                <motion.form
                  key="step1"
                  custom={direction}
                  variants={slide}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.35, ease: EASE }}
                  onSubmit={(e) => submitStep(e, 1)}
                  noValidate
                  className="space-y-5"
                >
                  <TextField label="Nombre y apellido" autoComplete="name" placeholder="Ej: Laura Gómez" {...fieldProps('customerName')} />
                  <div>
                    <TextField
                      label="Correo electrónico"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="tucorreo@gmail.com"
                      hint="Aquí te llega la confirmación del pedido."
                      {...fieldProps('customerEmail')}
                    />
                    {suggestEmail(form.customerEmail) && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, customerEmail: suggestEmail(f.customerEmail)! }))}
                        className="mt-2 text-sm text-coffee-700 underline decoration-cream-300 underline-offset-4 hover:text-coffee-900"
                      >
                        ¿Quisiste decir <strong className="font-semibold">{suggestEmail(form.customerEmail)}</strong>?
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
                    <TextField
                      label="Celular"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="300 123 4567"
                      hint="La transportadora te llama si hace falta."
                      {...fieldProps('shippingPhone')}
                    />
                    <TextField
                      label="Cédula"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="1023456789"
                      hint="La pide la transportadora."
                      {...fieldProps('customerDocument')}
                    />
                  </div>

                  <StepActions>
                    <PrimaryButton type="submit">Continuar a la entrega</PrimaryButton>
                  </StepActions>
                </motion.form>
              )}

              {step === 2 && (
                <motion.form
                  key="step2"
                  custom={direction}
                  variants={slide}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.35, ease: EASE }}
                  onSubmit={(e) => submitStep(e, 2)}
                  noValidate
                  className="space-y-5"
                >
                  <TextField
                    label="Dirección"
                    autoComplete="address-line1"
                    placeholder="Ej: Calle 45 # 12-30"
                    {...fieldProps('shippingAddress')}
                  />
                  <TextField
                    label="Apto, torre o barrio"
                    optional
                    autoComplete="address-line2"
                    placeholder="Apto 501, torre 2, barrio Chapinero"
                    {...fieldProps('shippingAddressComplement')}
                  />
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
                    <SelectField label="Departamento" autoComplete="address-level1" {...fieldProps('shippingDepartment')}>
                      <option value="" disabled>
                        Selecciona
                      </option>
                      {COLOMBIA_DEPARTMENTS.map((dep) => (
                        <option key={dep} value={dep}>
                          {dep}
                        </option>
                      ))}
                    </SelectField>
                    <TextField label="Ciudad o municipio" autoComplete="address-level2" placeholder="Ej: Medellín" {...fieldProps('shippingCity')} />
                  </div>

                  {notesOpen || form.deliveryNotes ? (
                    <label className="block">
                      <FieldLabel label="Indicaciones para el repartidor" optional />
                      <textarea
                        rows={3}
                        autoFocus={notesOpen && !form.deliveryNotes}
                        placeholder="Ej: dejar en portería, no hay timbre, llamar al llegar…"
                        value={form.deliveryNotes}
                        onChange={(e) =>
                          setForm({ ...form, deliveryNotes: autoBulletize(e.target.value, e.target.selectionStart) })
                        }
                        onPaste={(e) =>
                          pasteBulletedText(e, form.deliveryNotes, (v) => setForm((f) => ({ ...f, deliveryNotes: v })))
                        }
                        className={`${INPUT} resize-none`}
                      />
                    </label>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setNotesOpen(true)}
                      className="flex items-center gap-1.5 text-sm font-medium text-coffee-700 transition-colors hover:text-coffee-900"
                    >
                      <PlusIcon /> Agregar indicaciones para el repartidor
                    </button>
                  )}

                  <ShippingNote shippingCents={shippingCents} thresholdCents={freeShippingThresholdCents} subtotalCents={subtotalCents} />

                  <StepActions onBack={() => goTo(1)}>
                    <PrimaryButton type="submit">Continuar al pago</PrimaryButton>
                  </StepActions>
                </motion.form>
              )}

              {step === 3 && !checkoutData && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={slide}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.35, ease: EASE }}
                  className="space-y-6"
                >
                  <div className="divide-y divide-cream-200 rounded-2xl border border-cream-200 bg-white/60">
                    <ReviewRow label="Contacto" onEdit={() => goTo(1)}>
                      <p className="font-medium text-coffee-900">{form.customerName}</p>
                      <p className="truncate">{form.customerEmail}</p>
                      <p>
                        {form.shippingPhone} · CC {form.customerDocument}
                      </p>
                    </ReviewRow>
                    <ReviewRow label="Entrega" onEdit={() => goTo(2)}>
                      <p className="font-medium text-coffee-900">
                        {form.shippingAddress}
                        {form.shippingAddressComplement && `, ${form.shippingAddressComplement}`}
                      </p>
                      <p>
                        {form.shippingCity}, {form.shippingDepartment}
                      </p>
                      <p className={shippingCents === 0 ? 'font-medium text-green-700' : ''}>
                        {shippingCents === 0 ? 'Envío gratis' : `Envío ${formatCOP(shippingCents)}`}
                      </p>
                    </ReviewRow>
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-coffee-900">¿Cómo quieres pagar?</p>
                    <div role="radiogroup" aria-label="Forma de pago" className="space-y-3">
                      <PaymentOption
                        selected={paymentMethod === 'WOMPI'}
                        onSelect={() => setPaymentMethod('WOMPI')}
                        icon={<CardIcon />}
                        title="Pagar en línea"
                        description="Tarjeta débito o crédito, PSE, Nequi o Bancolombia."
                        tags={['Tarjeta', 'PSE', 'Nequi', 'Bancolombia']}
                      />
                      <PaymentOption
                        selected={paymentMethod === 'COD'}
                        onSelect={() => setPaymentMethod('COD')}
                        icon={<CashIcon />}
                        title="Pagar al recibir"
                        description={`Pagas ${formatCOP(totalCents)} en efectivo o datáfono cuando te llegue.`}
                        tags={['Contra entrega']}
                      />
                    </div>
                  </div>

                  <CouponBox
                    coupon={coupon}
                    discountCents={discountCents}
                    open={couponOpen}
                    onOpen={() => setCouponOpen(true)}
                    input={couponInput}
                    onInput={(v) => {
                      setCouponInput(v);
                      setCouponError('');
                    }}
                    onApply={applyCoupon}
                    onRemove={() => {
                      setCoupon(null);
                      setCheckoutData(null);
                    }}
                    loading={couponLoading}
                    error={couponError}
                  />

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        role="alert"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <StepActions onBack={() => goTo(2)}>
                    <PrimaryButton type="button" onClick={handleConfirmPayment} disabled={loading}>
                      {loading ? (
                        <>
                          <Spinner /> Creando tu pedido…
                        </>
                      ) : paymentMethod === 'COD' ? (
                        `Confirmar pedido · ${formatCOP(totalCents)}`
                      ) : (
                        <>
                          <LockIcon /> Pagar {formatCOP(totalCents)}
                        </>
                      )}
                    </PrimaryButton>
                  </StepActions>
                  <p className="text-center text-xs text-coffee-500">
                    Al confirmar aceptas nuestros{' '}
                    <Link href="/terminos" className="underline underline-offset-2 hover:text-coffee-800">
                      términos
                    </Link>{' '}
                    y{' '}
                    <Link href="/privacidad" className="underline underline-offset-2 hover:text-coffee-800">
                      política de privacidad
                    </Link>
                    .
                  </p>
                </motion.div>
              )}

              {step === 3 && checkoutData && (
                <motion.div
                  key="wompi"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="mt-8 space-y-6"
                >
                  <div className="text-center">
                    <motion.span
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
                      className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-coffee-900 text-cream-50"
                    >
                      <CheckIcon size={26} />
                    </motion.span>
                    <h1 className="mt-4 text-2xl font-semibold tracking-tight text-coffee-900">
                      {firstName ? `Tu pedido está apartado, ${firstName}` : 'Tu pedido está apartado'}
                    </h1>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-coffee-600">
                      Paga {formatCOP(checkoutData.amountInCents)} en Wompi para confirmarlo. Tus datos ya van
                      llenos.
                    </p>
                    <p className="mt-2 text-xs text-coffee-500">Pedido {checkoutData.reference}</p>
                  </div>

                  <WompiCheckoutButton
                    publicKey={checkoutData.publicKey}
                    currency={checkoutData.currency}
                    amountInCents={checkoutData.amountInCents}
                    reference={checkoutData.reference}
                    signature={checkoutData.signature}
                    redirectUrl={`${window.location.origin}/checkout/success?ref=${checkoutData.reference}`}
                    customer={wompiCustomer}
                    shippingAddress={wompiShipping}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutData(null);
                      setPaymentMethod('COD');
                    }}
                    className="mx-auto block text-sm text-coffee-600 underline-offset-4 transition-colors hover:text-coffee-900 hover:underline"
                  >
                    Prefiero pagar al recibir
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <aside className="hidden rounded-2xl border border-cream-200 bg-white/50 p-6 md:sticky md:top-6 md:block">
            <p className="mb-5 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-coffee-900">Tu pedido</span>
              <span className="text-xs text-coffee-500">
                {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
              </span>
            </p>
            {summary}
          </aside>
        </div>
      </div>
    </div>
  );
}

const INPUT =
  'w-full rounded-xl border bg-white px-4 py-3.5 text-base text-coffee-900 placeholder:text-coffee-400/70 transition-[border-color,box-shadow] focus:outline-none focus:ring-4 sm:text-sm';

function inputState(error: string | null | undefined) {
  return error
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
    : 'border-cream-300 focus:border-coffee-700 focus:ring-coffee-900/10';
}

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <span className="mb-1.5 flex items-baseline gap-1.5 text-sm font-medium text-coffee-800">
      {label}
      {optional && <span className="text-xs font-normal text-coffee-500">(opcional)</span>}
    </span>
  );
}

function FieldMessage({ error, hint }: { error?: string | null; hint?: string }) {
  if (error) {
    return (
      <span role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
        <AlertIcon /> {error}
      </span>
    );
  }
  return hint ? <span className="mt-1.5 block text-xs text-coffee-500">{hint}</span> : null;
}

type TextFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string | null;
  valid?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

function TextField({ label, hint, optional, error, valid, ...input }: TextFieldProps) {
  return (
    <label className="block">
      <FieldLabel label={label} optional={optional} />
      <span className="relative block">
        <input {...input} aria-invalid={Boolean(error)} className={`${INPUT} ${inputState(error)} ${valid ? 'pr-11' : ''}`} />
        <AnimatePresence>
          {valid && (
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-green-600"
            >
              <CheckIcon size={18} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <FieldMessage error={error} hint={hint} />
    </label>
  );
}

type SelectFieldProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  label: string;
  error?: string | null;
  valid?: boolean;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
};

function SelectField({ label, error, valid: _valid, children, ...select }: SelectFieldProps) {
  return (
    <label className="block">
      <FieldLabel label={label} />
      <span className="relative block">
        <select
          {...select}
          aria-invalid={Boolean(error)}
          className={`${INPUT} ${inputState(error)} appearance-none pr-10 ${select.value ? '' : 'text-coffee-400'}`}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-coffee-500">
          <ChevronDownIcon open={false} />
        </span>
      </span>
      <FieldMessage error={error} />
    </label>
  );
}

function StepActions({ onBack, children }: { onBack?: () => void; children: React.ReactNode }) {
  // Sticky on phones so the next step is always one thumb away, even with
  // the keyboard pushing the form around.
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-cream-200 bg-cream-50/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-2 sm:backdrop-blur-none">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver al paso anterior"
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-cream-300 text-coffee-700 transition-colors hover:border-coffee-700 hover:text-coffee-900 active:scale-95 sm:w-auto sm:px-6 sm:text-sm sm:font-medium"
        >
          <span className="sm:hidden">
            <ChevronLeftIcon />
          </span>
          <span className="hidden sm:inline">Atrás</span>
        </button>
      )}
      {children}
    </div>
  );
}

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-coffee-900 px-6 text-[15px] font-medium tracking-wide text-cream-50 shadow-[0_10px_24px_-12px_rgba(41,28,19,0.6)] transition-all hover:bg-coffee-800 active:scale-[0.98] disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function Progress({ step, onGoTo }: { step: Step; onGoTo: (n: Step) => void }) {
  return (
    <nav aria-label="Pasos del pago">
      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map(({ n, label }) => {
          const done = n < step;
          const active = n === step;
          return (
            <li key={n}>
              <button
                type="button"
                onClick={() => onGoTo(n)}
                disabled={!done}
                aria-current={active ? 'step' : undefined}
                className="group block w-full text-left disabled:cursor-default"
              >
                <span className="relative block h-1.5 overflow-hidden rounded-full bg-cream-200">
                  <motion.span
                    initial={false}
                    animate={{ width: done || active ? '100%' : '0%' }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className={`absolute inset-y-0 left-0 rounded-full ${active ? 'bg-coffee-700' : 'bg-coffee-900'}`}
                  />
                </span>
                <span
                  className={`mt-2 flex items-center gap-1 text-xs font-medium transition-colors ${
                    active ? 'text-coffee-900' : done ? 'text-coffee-700 group-hover:text-coffee-900' : 'text-coffee-400'
                  }`}
                >
                  {done && <CheckIcon size={13} />}
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ReviewRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 p-4 sm:p-5">
      <p className="w-16 shrink-0 pt-0.5 text-xs font-medium uppercase tracking-wide text-coffee-500">{label}</p>
      <div className="min-w-0 flex-1 space-y-0.5 text-sm text-coffee-600">{children}</div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-sm font-medium text-coffee-700 underline decoration-cream-300 underline-offset-4 transition-colors hover:text-coffee-900 hover:decoration-coffee-700"
      >
        Editar
      </button>
    </div>
  );
}

function PaymentOption({
  selected,
  onSelect,
  icon,
  title,
  description,
  tags,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  tags: string[];
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`relative flex w-full items-start gap-3.5 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.99] ${
        selected ? 'border-coffee-900 bg-white shadow-[0_8px_24px_-16px_rgba(41,28,19,0.5)]' : 'border-cream-200 bg-white/40 hover:border-cream-300'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
          selected ? 'bg-coffee-900 text-cream-50' : 'bg-cream-100 text-coffee-600'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-coffee-900">{title}</span>
        <span className="mt-0.5 block text-sm text-coffee-600">{description}</span>
        <span className="mt-2.5 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="rounded-md bg-cream-100 px-2 py-0.5 text-[11px] font-medium text-coffee-700">
              {t}
            </span>
          ))}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          selected ? 'border-coffee-900 bg-coffee-900' : 'border-cream-300'
        }`}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-cream-50" />}
      </span>
    </button>
  );
}

function CouponBox({
  coupon,
  discountCents,
  open,
  onOpen,
  input,
  onInput,
  onApply,
  onRemove,
  loading,
  error,
}: {
  coupon: { code: string } | null;
  discountCents: number;
  open: boolean;
  onOpen: () => void;
  input: string;
  onInput: (v: string) => void;
  onApply: () => void;
  onRemove: () => void;
  loading: boolean;
  error: string;
}) {
  if (coupon) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <span className="flex items-center gap-2 text-sm text-green-800">
          <TagIcon />
          <span>
            <strong className="font-semibold">{coupon.code}</strong> aplicado · ahorras {formatCOP(discountCents)}
          </span>
        </span>
        <button type="button" onClick={onRemove} className="text-sm font-medium text-green-800 underline underline-offset-2">
          Quitar
        </button>
      </div>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-1.5 text-sm font-medium text-coffee-700 transition-colors hover:text-coffee-900"
      >
        <TagIcon /> ¿Tienes un cupón de descuento?
      </button>
    );
  }
  return (
    <div>
      <div className="flex gap-2">
        <input
          autoFocus
          value={input}
          onChange={(e) => onInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onApply();
            }
          }}
          placeholder="Código del cupón"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-label="Código del cupón"
          className={`${INPUT} ${inputState(error)} uppercase tracking-wide`}
        />
        <button
          type="button"
          onClick={onApply}
          disabled={loading || !input.trim()}
          className="shrink-0 rounded-xl border border-coffee-900 px-5 text-sm font-medium text-coffee-900 transition-colors hover:bg-coffee-900 hover:text-cream-50 disabled:border-cream-300 disabled:text-coffee-400 disabled:hover:bg-transparent"
        >
          {loading ? <Spinner /> : 'Aplicar'}
        </button>
      </div>
      <FieldMessage error={error} />
    </div>
  );
}

function ShippingNote({
  shippingCents,
  thresholdCents,
  subtotalCents,
}: {
  shippingCents: number;
  thresholdCents: number;
  subtotalCents: number;
}) {
  const free = shippingCents === 0;
  return (
    <div
      className={`flex items-start gap-3 rounded-xl px-4 py-3.5 text-sm ${
        free ? 'bg-green-50 text-green-800' : 'bg-cream-100 text-coffee-700'
      }`}
    >
      <span className="mt-0.5">
        <TruckIcon />
      </span>
      <p>
        {free ? (
          <>
            <strong className="font-semibold">Tu envío es gratis.</strong> Despachamos en 24 horas hábiles con guía de
            seguimiento.
          </>
        ) : (
          <>
            Envío a cualquier parte de Colombia por <strong className="font-semibold">{formatCOP(shippingCents)}</strong>.
            {thresholdCents > 0 && (
              <> Gratis si tu pedido llega a {formatCOP(thresholdCents)} (te faltan {formatCOP(thresholdCents - subtotalCents)}).</>
            )}
          </>
        )}
      </p>
    </div>
  );
}

function ShippingProgress({
  subtotalCents,
  thresholdCents,
  compact,
}: {
  subtotalCents: number;
  thresholdCents: number;
  compact?: boolean;
}) {
  const unlocked = subtotalCents >= thresholdCents;
  const pct = Math.min(100, Math.round((subtotalCents / thresholdCents) * 100));
  return (
    <div>
      <p className={`flex items-center gap-1.5 text-xs font-medium ${unlocked ? 'text-green-700' : 'text-coffee-700'}`}>
        <TruckIcon size={14} />
        {unlocked ? (
          'Tu envío es gratis'
        ) : (
          <span>
            Te faltan <strong className="font-semibold">{formatCOP(thresholdCents - subtotalCents)}</strong> para envío gratis
          </span>
        )}
      </p>
      <div className={`relative w-full overflow-hidden rounded-full bg-cream-200 ${compact ? 'mt-1.5 h-1' : 'mt-2 h-1.5'}`}>
        <motion.div
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className={`h-full rounded-full ${unlocked ? 'bg-green-600' : 'bg-coffee-800'}`}
        />
      </div>
      {!unlocked && !compact && (
        <Link
          href="/productos"
          className="mt-2 inline-block text-xs font-medium text-coffee-700 underline decoration-cream-300 underline-offset-4 hover:text-coffee-900"
        >
          Agregar más productos
        </Link>
      )}
    </div>
  );
}

function OrderSummary({
  items,
  subtotalCents,
  discountCents,
  couponCode,
  shippingCents,
  totalCents,
  thresholdCents,
}: {
  items: ReturnType<typeof useCart>['items'];
  subtotalCents: number;
  discountCents: number;
  couponCode?: string;
  shippingCents: number;
  totalCents: number;
  thresholdCents: number;
}) {
  return (
    <div>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={`${item.productId}-${item.size}-${item.color ?? ''}`} className="flex items-center gap-3">
            <div className="relative h-[72px] w-14 shrink-0 rounded-lg bg-cream-100">
              {item.image && (
                <div className="absolute inset-0 overflow-hidden rounded-lg">
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                </div>
              )}
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-coffee-900 px-1 text-[10px] font-medium text-cream-50">
                {item.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-coffee-900">{item.name}</p>
              <p className="text-xs text-coffee-500">
                Talla {item.size}
                {item.color ? ` · ${item.color}` : ''}
              </p>
            </div>
            <p className="shrink-0 text-sm tabular-nums text-coffee-800">{formatCOP(item.priceCents * item.quantity)}</p>
          </li>
        ))}
      </ul>

      {thresholdCents > 0 && (
        <div className="mt-5 rounded-xl bg-cream-100/70 p-3.5">
          <ShippingProgress subtotalCents={subtotalCents} thresholdCents={thresholdCents} />
        </div>
      )}

      <dl className="mt-5 space-y-2 border-t border-cream-200 pt-4 text-sm">
        <div className="flex justify-between text-coffee-600">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatCOP(subtotalCents)}</dd>
        </div>
        {discountCents > 0 && (
          <div className="flex justify-between text-green-700">
            <dt>Descuento{couponCode ? ` (${couponCode})` : ''}</dt>
            <dd className="tabular-nums">-{formatCOP(discountCents)}</dd>
          </div>
        )}
        <div className="flex justify-between text-coffee-600">
          <dt>Envío</dt>
          <dd className={shippingCents === 0 ? 'font-medium text-green-700' : 'tabular-nums'}>
            {shippingCents === 0 ? 'Gratis' : formatCOP(shippingCents)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-cream-200 pt-3">
          <dt className="font-semibold text-coffee-900">Total</dt>
          <dd className="text-xl font-semibold tabular-nums text-coffee-900">
            <span className="mr-1 text-xs font-normal text-coffee-500">COP</span>
            {formatCOP(totalCents)}
          </dd>
        </div>
      </dl>

      <ul className="mt-5 space-y-2.5 border-t border-cream-200 pt-4 text-xs text-coffee-600">
        <li className="flex items-center gap-2">
          <LockIcon /> Pago seguro en línea o contra entrega
        </li>
        <li className="flex items-center gap-2">
          <TruckIcon size={14} /> Despacho en 24 h hábiles con guía de seguimiento
        </li>
        <li className="flex items-center gap-2">
          <CheckIcon size={14} /> Garantía y cambios sin costo
        </li>
      </ul>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" strokeLinecap="round" />
      <path d="M7 14.5h4" strokeLinecap="round" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M5.5 9v0M18.5 15v0" strokeLinecap="round" />
    </svg>
  );
}

function BagIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M6 8h12l-1 12H7L6 8Z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 12V4h8l10 10-8 8L3 12Z" strokeLinejoin="round" />
      <circle cx="7.5" cy="8.5" r="1.3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5M12 16h.01" strokeLinecap="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  );
}

function TruckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0" aria-hidden="true">
      <path d="M2 8h11v8H2z" strokeLinejoin="round" />
      <path d="M13 11h4l3 3v2h-7z" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

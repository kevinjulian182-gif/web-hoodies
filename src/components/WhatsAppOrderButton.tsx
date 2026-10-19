'use client';

import { useEffect, useRef, useState } from 'react';
import { buildWhatsAppLink, buildWhatsAppOrderMessage } from '@/lib/whatsapp';

type OrderItem = { productId: string; name: string; size: string; color?: string; quantity: number; priceCents: number };

const STORAGE_KEY = 'afra-wa-customer';

// "Pedir por WhatsApp": asks for name, phone and city, registers the order
// (Admin › Pedidos + store alert), then hands off to the chat with the order
// reference in the message. If registering fails the chat still opens —
// a sale is never blocked on our side.
export default function WhatsAppOrderButton({
  whatsappNumber,
  items,
  className,
  children,
}: {
  whatsappNumber: string;
  items: OrderItem[];
  className: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (saved) {
        setName((v) => v || saved.name || '');
        setPhone((v) => v || saved.phone || '');
        setCity((v) => v || saved.city || '');
      }
    } catch {
      // no saved details
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => nameRef.current?.focus(), 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open]);

  const subtotalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (name.trim().length < 2) return setError('Escribe tu nombre.');
    if (digits.length < 7) return setError('Escribe un celular válido.');
    setError('');
    setSending(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name.trim(), phone: phone.trim(), city: city.trim() }));
    } catch {
      // storage unavailable
    }
    let reference: string | undefined;
    let shipping: { free: boolean; fromCents: number } | undefined;
    try {
      const res = await fetch('/api/orders/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name.trim(),
          phone: phone.trim(),
          city: city.trim() || undefined,
          items: items.map(({ productId, size, color, quantity }) => ({ productId, size, color, quantity })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        reference = data.reference;
        shipping = { free: data.freeShipping, fromCents: data.shippingFromCents };
      }
    } catch {
      // still open the chat
    }
    const message = buildWhatsAppOrderMessage(items, subtotalCents, {
      name: name.trim(),
      city: city.trim() || undefined,
      reference,
      shipping,
    });
    window.location.href = buildWhatsAppLink(whatsappNumber, message);
    setSending(false);
    setOpen(false);
  };

  const input =
    'w-full rounded-xl border border-cream-200 bg-white px-4 py-3 text-base text-coffee-900 placeholder:text-coffee-300 focus:border-coffee-700 focus:outline-none focus:ring-2 focus:ring-coffee-900/10';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label="Pedir por WhatsApp">
          <button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} className="absolute inset-0 bg-coffee-900/40 backdrop-blur-[2px]" />
          <form
            onSubmit={submit}
            className="relative w-full max-w-md rounded-t-3xl bg-cream-50 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl md:rounded-3xl md:p-7"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-cream-300 md:hidden" aria-hidden="true" />
            <h2 className="text-lg font-semibold tracking-tightest text-coffee-900">Pedir por WhatsApp</h2>
            <p className="mt-1 text-sm text-coffee-600">
              Déjanos tus datos y te llevamos al chat con tu pedido listo para enviar.
            </p>

            <div className="mt-5 space-y-3">
              <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" autoComplete="name" className={input} />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Celular"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className={input}
              />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ciudad (opcional)" autoComplete="address-level2" className={input} />
            </div>

            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={sending}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-4 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-[#1ebe5b] active:scale-[0.98] disabled:opacity-70"
            >
              {sending ? 'Abriendo WhatsApp…' : 'Continuar en WhatsApp'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full py-2 text-sm text-coffee-600 hover:text-coffee-900">
              Cancelar
            </button>
          </form>
        </div>
      )}
    </>
  );
}

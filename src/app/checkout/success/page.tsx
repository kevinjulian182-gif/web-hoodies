'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { PENDING_PURCHASE_KEY, trackPixel } from '@/lib/metaPixel';
import { track } from '@/lib/analytics';

type PaymentState = 'checking' | 'APPROVED' | 'PENDING' | 'DECLINED' | 'UNKNOWN';

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function recordPurchase(reference: string | null, isCod: boolean) {
  // Meta Pixel Purchase, once, with what was saved when the order was made.
  try {
    const pending = JSON.parse(sessionStorage.getItem(PENDING_PURCHASE_KEY) || 'null');
    if (pending && pending.reference === reference) {
      trackPixel(
        'Purchase',
        {
          content_type: 'product',
          contents: pending.contents,
          content_ids: pending.contents.map((c: { id: string }) => c.id),
          num_items: pending.contents.reduce((n: number, c: { quantity: number }) => n + c.quantity, 0),
          value: pending.value,
          currency: 'COP',
        },
        reference ?? undefined
      );
      track('purchase', { value: pending.value, detail: isCod ? 'contra entrega' : 'en línea' });
      sessionStorage.removeItem(PENDING_PURCHASE_KEY);
    }
  } catch {
    // storage unavailable
  }
}

function CheckoutSuccessContent() {
  const { clear } = useCart();
  const params = useSearchParams();
  const reference = params.get('ref');
  const transactionId = params.get('id');
  const isCod = params.get('method') === 'cod';
  const [payment, setPayment] = useState<PaymentState>(isCod ? 'APPROVED' : transactionId ? 'checking' : 'UNKNOWN');

  useEffect(() => {
    if (isCod || !transactionId || !reference) return;
    // Settles the order with Wompi right away, without waiting on the webhook.
    fetch(`/api/checkout/verify?id=${encodeURIComponent(transactionId)}&ref=${encodeURIComponent(reference)}`, {
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((d) => {
        const s = d.status as string;
        setPayment(s === 'APPROVED' || s === 'PENDING' ? s : s === 'UNKNOWN' ? 'UNKNOWN' : 'DECLINED');
      })
      .catch(() => setPayment('UNKNOWN'));
  }, [isCod, transactionId, reference]);

  useEffect(() => {
    if (payment === 'checking' || payment === 'DECLINED') return;
    recordPurchase(reference, isCod);
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment]);

  const copy: Record<PaymentState, { title: string; body: string }> = {
    checking: { title: 'Confirmando tu pago…', body: 'Estamos consultando el resultado con Wompi. Solo toma unos segundos.' },
    APPROVED: isCod
      ? {
          title: 'Tu pedido ha sido confirmado',
          body: 'Lo enviaremos el día de mañana. Pagas en efectivo o con datáfono cuando lo recibas.',
        }
      : {
          title: 'Tu compra ha sido exitosa',
          body: 'Tu producto será enviado el día de mañana y te compartiremos tu guía de seguimiento por correo.',
        },
    PENDING: {
      title: 'Tu pago está en proceso',
      body: 'Tu banco aún no confirma el pago. Apenas lo apruebe te llegará la confirmación por correo y WhatsApp.',
    },
    DECLINED: {
      title: 'El pago no se completó',
      body: 'Wompi no aprobó la transacción y no se hizo ningún cobro. Tu carrito sigue guardado para que lo intentes de nuevo.',
    },
    UNKNOWN: {
      title: 'Recibimos tu pedido',
      body: 'Si el pago fue aprobado te llegará la confirmación por correo y WhatsApp. Si tienes dudas, escríbenos con tu referencia.',
    },
  };
  const { title, body } = copy[payment];

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center" aria-live="polite">
      <h1 className="text-3xl font-semibold tracking-tightest text-coffee-900 mb-4 text-balance">{title}</h1>
      <p className="text-coffee-700 max-w-md text-pretty">{body}</p>
      {reference && <p className="mt-4 text-sm text-coffee-500">Referencia: {reference}</p>}
      {payment === 'DECLINED' ? (
        <Link
          href="/checkout"
          className="mt-10 rounded-full bg-coffee-900 px-6 py-3 text-sm font-medium text-cream-50 transition-transform active:scale-[0.98]"
        >
          Intentar de nuevo
        </Link>
      ) : (
        <Link href="/" className="mt-10 text-coffee-900 underline text-sm">
          Volver al inicio
        </Link>
      )}
    </div>
  );
}

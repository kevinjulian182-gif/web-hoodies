'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { PENDING_PURCHASE_KEY, trackPixel } from '@/lib/metaPixel';

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function CheckoutSuccessContent() {
  const { clear } = useCart();
  const params = useSearchParams();
  const reference = params.get('ref');
  const isCod = params.get('method') === 'cod';

  useEffect(() => {
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
        sessionStorage.removeItem(PENDING_PURCHASE_KEY);
      }
    } catch {
      // storage unavailable
    }
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tightest text-coffee-900 mb-4">
        {isCod ? 'Tu pedido ha sido confirmado' : 'Tu compra ha sido exitosa'}
      </h1>
      <p className="text-coffee-700 max-w-md">
        {isCod
          ? 'Lo enviaremos el día de mañana. Pagas en efectivo o con datáfono cuando lo recibas.'
          : 'Tu producto será enviado el día de mañana y te compartiremos tu guía de seguimiento por correo.'}
      </p>
      {reference && <p className="mt-4 text-sm text-coffee-500">Referencia: {reference}</p>}
      <Link href="/" className="mt-10 text-coffee-900 underline text-sm">
        Volver al inicio
      </Link>
    </div>
  );
}

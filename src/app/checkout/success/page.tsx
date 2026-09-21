'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/lib/cart';

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

'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-sm uppercase tracking-wide text-coffee-500">Algo salió mal</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tightest text-coffee-900">
        No pudimos cargar esta página
      </h1>
      <p className="mt-3 text-coffee-600">
        Puede ser un problema temporal de conexión. Intenta de nuevo en un momento.
      </p>
      <button
        onClick={reset}
        className="mt-8 rounded-full bg-coffee-900 px-8 py-3 text-sm font-medium text-cream-50 hover:bg-coffee-800 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-coffee-500">Error 404</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tightest text-coffee-900 md:text-5xl">
        Esta página no existe
      </h1>
      <p className="mt-4 text-coffee-600">
        El enlace puede estar roto o la pieza que buscas ya no está disponible.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-coffee-900 px-6 py-3 text-sm font-medium text-cream-50 transition-colors hover:bg-coffee-800"
        >
          Volver al inicio
        </Link>
        <Link
          href="/productos"
          className="rounded-full border border-cream-300 px-6 py-3 text-sm font-medium text-coffee-800 transition-colors hover:border-coffee-600"
        >
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}

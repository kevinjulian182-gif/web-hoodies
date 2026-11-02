'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function GestorShell({ email, children }: { email?: string; children: React.ReactNode }) {
  const router = useRouter();

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login?from=/gestor');
    router.refresh();
  };

  return (
    <div className="min-h-dvh bg-cream-50">
      <header className="sticky top-0 z-40 border-b border-cream-200 bg-cream-50/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/gestor" className="flex items-center gap-2.5" aria-label="Gestor de pedidos">
            <Logo className="h-4 w-auto text-coffee-900" />
            <span className="rounded-md bg-coffee-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cream-50">
              Pedidos
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm" aria-label="Gestor">
            {email && <span className="mr-2 hidden text-xs text-coffee-500 md:inline">{email}</span>}
            <Link href="/admin" className="rounded-lg px-3 py-2 text-coffee-700 transition-colors hover:bg-cream-100 hover:text-coffee-900">
              Panel admin
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg px-3 py-2 text-coffee-700 transition-colors hover:bg-cream-100 hover:text-coffee-900"
            >
              Salir
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">{children}</main>
    </div>
  );
}

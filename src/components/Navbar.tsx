'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart';

export default function Navbar() {
  const pathname = usePathname();
  const { items } = useCart();

  if (pathname.startsWith('/checkout')) return null;

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <header className="sticky top-0 z-50 bg-cream-50/80 backdrop-blur-md border-b border-cream-200">
      <nav className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tightest text-coffee-900">
          AFRA°
        </Link>
        <div className="flex items-center gap-8 text-sm font-medium text-coffee-700">
          <Link href="/productos" className="hover:text-coffee-900 transition-colors">
            Catálogo
          </Link>
          <Link href="/checkout" className="hover:text-coffee-900 transition-colors">
            Carrito {itemCount > 0 && `(${itemCount})`}
          </Link>
        </div>
      </nav>
    </header>
  );
}

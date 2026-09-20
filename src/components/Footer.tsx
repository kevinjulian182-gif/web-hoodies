'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const COLUMNS = [
  {
    title: 'Tienda',
    links: [
      { href: '/productos', label: 'Catálogo' },
      { href: '/checkout', label: 'Carrito' },
      { href: '/blog', label: 'Blog' },
      { href: '/nosotros', label: 'Nosotros' },
    ],
  },
  {
    title: 'Marcas',
    links: [
      { href: '/productos', label: 'Nike' },
      { href: '/productos', label: 'Supreme' },
      { href: '/productos', label: 'Essentials' },
      { href: '/productos', label: 'Bape' },
    ],
  },
];

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/checkout') || pathname.startsWith('/admin')) return null;

  return (
    <footer className="bg-coffee-900 text-cream-100">
      <div className="mx-auto max-w-7xl px-6 py-16 grid md:grid-cols-[1.5fr_1fr_1fr] gap-12">
        <div>
          <p className="text-2xl font-semibold tracking-tightest text-cream-50">AFRA°</p>
          <p className="mt-4 text-sm text-cream-100/60 max-w-xs">
            Streetwear de élite. Piezas originales de las marcas más exclusivas, curadas para quienes
            exigen lo mejor.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cream-100/50 mb-4">
              {col.title}
            </p>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-cream-100/80 hover:text-cream-50 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-cream-50/10">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-cream-100/40">
          <p>© {new Date().getFullYear()} AFRA. Todos los derechos reservados.</p>
          <p>Bogotá, Colombia</p>
        </div>
      </div>
    </footer>
  );
}

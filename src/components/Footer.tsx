'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const COLUMNS = [
  {
    title: 'Tienda',
    links: [
      { href: '/productos', label: 'Catálogo' },
      { href: '/checkout', label: 'Carrito' },
      { href: '/favoritos', label: 'Favoritos' },
      { href: '/blog', label: 'Blog' },
      { href: '/nosotros', label: 'Nosotros' },
    ],
  },
  {
    title: 'Marcas',
    links: [
      { href: '/productos?marca=Nike', label: 'Nike' },
      { href: '/productos?marca=Supreme', label: 'Supreme' },
      { href: '/productos?marca=Essentials', label: 'Essentials' },
      { href: '/productos?marca=Bape', label: 'Bape' },
    ],
  },
];

const TRUST_BADGES = [
  { label: 'Pago contra entrega', icon: <TruckIcon /> },
  { label: 'Piezas 100% originales', icon: <BadgeIcon /> },
  { label: 'Envíos a toda Colombia', icon: <MapIcon /> },
];

export default function Footer({ tagline }: { tagline: string }) {
  const pathname = usePathname();
  if (pathname.startsWith('/checkout') || pathname.startsWith('/admin')) return null;

  return (
    <footer className="bg-coffee-900 text-cream-100">
      <div className="border-b border-cream-50/10">
        <div className="mx-auto max-w-7xl px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {TRUST_BADGES.map((badge) => (
            <div key={badge.label} className="flex items-center gap-3 text-cream-100/70">
              <span className="text-cream-50/80">{badge.icon}</span>
              <span className="text-xs uppercase tracking-wide">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-16 grid md:grid-cols-[1.5fr_1fr_1fr] gap-12">
        <div>
          <p className="text-2xl font-semibold tracking-tightest text-cream-50">AFRA°</p>
          <p className="mt-4 text-sm text-cream-100/60 max-w-xs leading-relaxed">{tagline}</p>
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

function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 8h11v8H2z" strokeLinejoin="round" />
      <path d="M13 11h4l3 3v2h-7z" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 2l2.4 2.1 3.1-.5.9 3 2.6 1.7-1 3 1 3-2.6 1.7-.9 3-3.1-.5L12 22l-2.4-2.1-3.1.5-.9-3-2.6-1.7 1-3-1-3 2.6-1.7.9-3 3.1.5L12 2Z" strokeLinejoin="round" />
      <path d="M9 12.5l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 21s-7-6.3-7-11.5A7 7 0 0 1 19 9.5C19 14.7 12 21 12 21Z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

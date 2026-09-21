'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const COLUMNS = [
  {
    title: 'Tienda',
    links: [
      { href: '/productos', label: 'Catálogo' },
      { href: '/promos', label: 'Promos' },
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

type SocialLinks = {
  instagramUrl?: string;
  tiktokUrl?: string;
  facebookUrl?: string;
  xUrl?: string;
};

export default function Footer({
  tagline,
  copyrightYear,
  social,
}: {
  tagline: string;
  copyrightYear: string;
  social: SocialLinks;
}) {
  const pathname = usePathname();
  if (pathname.startsWith('/checkout') || pathname.startsWith('/admin')) return null;

  const allSocialLinks = [
    { href: social.instagramUrl, label: 'Instagram', icon: <InstagramIcon /> },
    { href: social.tiktokUrl, label: 'TikTok', icon: <TikTokIcon /> },
    { href: social.facebookUrl, label: 'Facebook', icon: <FacebookIcon /> },
    { href: social.xUrl, label: 'X (Twitter)', icon: <XIcon /> },
  ];
  const socialLinks = allSocialLinks.filter(
    (s): s is { href: string; label: string; icon: JSX.Element } => Boolean(s.href)
  );

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
          {socialLinks.length > 0 && (
            <div className="mt-5 flex items-center gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-50/15 text-cream-100/80 transition-colors hover:border-cream-50/40 hover:text-cream-50"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          )}
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
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-cream-100/40">
          <p>© {copyrightYear} AFRA. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/terminos" className="hover:text-cream-100/70 transition-colors">
              Términos y condiciones
            </Link>
            <Link href="/privacidad" className="hover:text-cream-100/70 transition-colors">
              Privacidad
            </Link>
          </div>
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

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 2h-3v13.5a3 3 0 1 1-2.4-2.94V9.4a6.1 6.1 0 1 0 5.4 6.06V8.8a7.3 7.3 0 0 0 4.5 1.55V7.3a4.4 4.4 0 0 1-4.5-4.3V2Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5 21v-7.8h2.6l.4-3h-3v-1.9c0-.87.24-1.46 1.5-1.46h1.6V4.14C15.9 4.1 14.9 4 13.7 4c-2.4 0-4 1.47-4 4.16v2.05H7v3h2.7V21h3.8Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 3h4.2l4 5.5L16.8 3H21l-6.6 8.4L21 21h-4.2l-4.3-5.9L7.2 21H3l6.9-8.8L4 3Z" />
    </svg>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '@/lib/cart';
import { useWishlist } from '@/lib/wishlist';
import SearchOverlay from '@/components/SearchOverlay';

const LINKS = [
  { href: '/productos', label: 'Catálogo' },
  { href: '/promos', label: 'Promos' },
  { href: '/blog', label: 'Blog' },
  { href: '/nosotros', label: 'Nosotros' },
];

function Wordmark({ logoUrl, className }: { logoUrl?: string; className: string }) {
  if (logoUrl) {
    return <Image src={logoUrl} alt="AFRA" width={140} height={40} className="h-8 w-auto object-contain" />;
  }
  return <span className={className}>AFRA°</span>;
}

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

type SocialLinks = {
  instagramUrl?: string;
  tiktokUrl?: string;
  facebookUrl?: string;
  xUrl?: string;
};

export default function Navbar({
  logoUrl,
  transparentOverHero,
  social,
}: {
  logoUrl?: string;
  transparentOverHero?: boolean;
  social?: SocialLinks;
}) {
  const pathname = usePathname();
  const { items, openCart } = useCart();
  const { ids: wishlistIds } = useWishlist();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  if (pathname.startsWith('/checkout') || pathname.startsWith('/voucher')) return null;

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  // Float transparently over the hero's own dark media instead of drawing a
  // visible bar on top of it; once scrolled past it, behave like a normal bar.
  const overHero = Boolean(transparentOverHero) && pathname === '/' && !scrolled;

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          overHero
            ? 'bg-transparent border-b border-transparent'
            : scrolled
              ? 'bg-cream-50/85 backdrop-blur-md border-b border-cream-200 shadow-[0_1px_0_0_rgba(42,33,25,0.04)]'
              : 'bg-cream-50/60 backdrop-blur-sm border-b border-transparent'
        }`}
      >
        <nav className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Wordmark
              logoUrl={logoUrl}
              className={`text-lg font-semibold tracking-tightest ${overHero ? 'text-cream-50' : 'text-coffee-900'}`}
            />
          </Link>

          <div className="hidden md:flex items-center gap-10 text-sm font-medium text-coffee-700">
            {LINKS.map((link) =>
              link.href === '/promos' ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`py-1 font-semibold transition-colors duration-200 ${
                    overHero
                      ? 'text-red-400 hover:text-red-300'
                      : pathname.startsWith(link.href)
                        ? 'text-red-700'
                        : 'text-red-700/90 hover:text-red-700'
                  }`}
                >
                  {link.label}
                </Link>
              ) : (
                <NavLink key={link.href} href={link.href} active={pathname.startsWith(link.href)} light={overHero}>
                  {link.label}
                </NavLink>
              )
            )}
          </div>

          <div className={`flex items-center gap-5 ${overHero ? 'text-cream-50' : 'text-coffee-800'}`}>
            <button
              aria-label="Buscar"
              onClick={() => setSearchOpen(true)}
              className={`hidden sm:block transition-all active:scale-90 ${overHero ? 'hover:text-cream-200' : 'hover:text-coffee-600'}`}
            >
              <SearchIcon />
            </button>

            <Link
              href="/favoritos"
              aria-label={`Favoritos${wishlistIds.length > 0 ? ` (${wishlistIds.length})` : ''}`}
              className={`relative hidden sm:block transition-colors ${overHero ? 'hover:text-cream-200' : 'hover:text-coffee-600'}`}
            >
              <HeartIcon />
              {wishlistIds.length > 0 && (
                <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-coffee-900 text-[10px] font-medium text-cream-50">
                  {wishlistIds.length}
                </span>
              )}
            </Link>

            <button
              aria-label={`Ver carrito${itemCount > 0 ? ` (${itemCount} productos)` : ''}`}
              onClick={openCart}
              className="relative flex items-center gap-2 transition-transform active:scale-90"
            >
              <BagIcon />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-coffee-900 text-[10px] font-medium text-cream-50"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <button
              aria-label="Abrir menú"
              onClick={() => setMenuOpen(true)}
              className="md:hidden transition-transform active:scale-90"
            >
              <MenuIcon />
            </button>
          </div>
        </nav>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Rendered as a sibling of <header>, not a descendant: an ancestor with
          backdrop-filter (the header's blur) creates a containing block for
          fixed-position children, which would break this drawer's inset-0. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-cream-50 md:hidden"
          >
            <div className="flex h-full flex-col">
              <div className="mx-auto flex h-16 w-full max-w-7xl shrink-0 items-center justify-between px-6">
                <Link href="/">
                  <Wordmark logoUrl={logoUrl} className="text-lg font-semibold tracking-tightest text-coffee-900" />
                </Link>
                <button aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} className="text-coffee-900">
                  <CloseIcon />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-8 pt-6">
                <motion.nav
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col gap-2"
                >
                  {LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`py-2 text-3xl font-semibold tracking-tightest ${
                        link.href === '/promos' ? 'text-red-700' : 'text-coffee-900'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </motion.nav>

                <motion.div
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.14, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-8 border-t border-cream-200 pt-6"
                >
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-coffee-400">Tu cuenta</p>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setSearchOpen(true);
                      }}
                      className="flex items-center justify-between py-3 text-left text-base font-medium text-coffee-800"
                    >
                      Buscar
                      <SearchIcon />
                    </button>
                    <Link
                      href="/favoritos"
                      className="flex items-center justify-between py-3 text-base font-medium text-coffee-800"
                    >
                      Favoritos
                      <span className="flex items-center gap-2 text-coffee-500">
                        {wishlistIds.length > 0 && <span>{wishlistIds.length}</span>}
                        <HeartIcon />
                      </span>
                    </Link>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        openCart();
                      }}
                      className="flex items-center justify-between py-3 text-left text-base font-medium text-coffee-800"
                    >
                      Carrito
                      <span className="flex items-center gap-2 text-coffee-500">
                        {itemCount > 0 && <span>{itemCount}</span>}
                        <BagIcon />
                      </span>
                    </button>
                  </div>
                </motion.div>

                {WHATSAPP_NUMBER && (
                  <motion.a
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.18, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola, tengo una pregunta sobre un producto de AFRA.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-8 flex items-center justify-center gap-2 rounded-full bg-coffee-900 py-3.5 text-sm font-medium text-cream-50 transition-colors active:scale-[0.98] hover:bg-coffee-800"
                  >
                    Escríbenos por WhatsApp
                  </motion.a>
                )}

                {social && Object.values(social).some(Boolean) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.22, duration: 0.4 }}
                    className="mt-8 flex items-center gap-3"
                  >
                    {social.instagramUrl && (
                      <SocialIconLink href={social.instagramUrl} label="Instagram">
                        <InstagramIcon />
                      </SocialIconLink>
                    )}
                    {social.tiktokUrl && (
                      <SocialIconLink href={social.tiktokUrl} label="TikTok">
                        <TikTokIcon />
                      </SocialIconLink>
                    )}
                    {social.facebookUrl && (
                      <SocialIconLink href={social.facebookUrl} label="Facebook">
                        <FacebookIcon />
                      </SocialIconLink>
                    )}
                    {social.xUrl && (
                      <SocialIconLink href={social.xUrl} label="X (Twitter)">
                        <XIcon />
                      </SocialIconLink>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SocialIconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-cream-200 text-coffee-700"
    >
      {children}
    </a>
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

function NavLink({
  href,
  active,
  light,
  children,
}: {
  href: string;
  active: boolean;
  light?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="group relative py-1">
      <span
        className={`transition-colors duration-200 ${
          light
            ? active
              ? 'text-cream-50'
              : 'text-cream-100/80 group-hover:text-cream-50'
            : active
              ? 'text-coffee-900'
              : 'text-coffee-700 group-hover:text-coffee-900'
        }`}
      >
        {children}
      </span>
      <span
        className={`absolute -bottom-0.5 left-0 h-px transition-all duration-300 ${light ? 'bg-cream-50' : 'bg-coffee-900'} ${
          active ? 'w-full' : 'w-0 group-hover:w-full'
        }`}
      />
    </Link>
  );
}

function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 8h12l-1 12H7L6 8Z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path
        d="M12 20.5s-7.5-4.7-10-9.3C.5 8 1.8 4.5 5 3.6c2.1-.6 4 .3 5 2 1-1.7 2.9-2.6 5-2 3.2.9 4.5 4.4 3 7.6-2.5 4.6-10 9.3-10 9.3Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

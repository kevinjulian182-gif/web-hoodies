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

export default function Navbar({ logoUrl }: { logoUrl?: string }) {
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

  if (pathname.startsWith('/checkout')) return null;

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-cream-50/85 backdrop-blur-md border-b border-cream-200 shadow-[0_1px_0_0_rgba(42,33,25,0.04)]'
            : 'bg-cream-50/60 backdrop-blur-sm border-b border-transparent'
        }`}
      >
        <nav className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Wordmark logoUrl={logoUrl} className="text-lg font-semibold tracking-tightest text-coffee-900" />
          </Link>

          <div className="hidden md:flex items-center gap-10 text-sm font-medium text-coffee-700">
            {LINKS.map((link) =>
              link.href === '/promos' ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`py-1 font-semibold ${
                    pathname.startsWith(link.href) ? 'text-red-700' : 'text-red-700/90 hover:text-red-700'
                  }`}
                >
                  {link.label}
                </Link>
              ) : (
                <NavLink key={link.href} href={link.href} active={pathname.startsWith(link.href)}>
                  {link.label}
                </NavLink>
              )
            )}
          </div>

          <div className="flex items-center gap-5">
            <button
              aria-label="Buscar"
              onClick={() => setSearchOpen(true)}
              className="hidden sm:block text-coffee-800 transition-all hover:text-coffee-600 active:scale-90"
            >
              <SearchIcon />
            </button>

            <Link
              href="/favoritos"
              aria-label={`Favoritos${wishlistIds.length > 0 ? ` (${wishlistIds.length})` : ''}`}
              className="relative hidden sm:block text-coffee-800 hover:text-coffee-600 transition-colors"
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
              className="relative flex items-center gap-2 text-coffee-800 transition-transform active:scale-90"
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
              className="md:hidden text-coffee-900 transition-transform active:scale-90"
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
            <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
              <Link href="/">
                <Wordmark logoUrl={logoUrl} className="text-lg font-semibold tracking-tightest text-coffee-900" />
              </Link>
              <button aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} className="text-coffee-900">
                <CloseIcon />
              </button>
            </div>
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-6 px-6 pt-12"
            >
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-4xl font-semibold tracking-tightest ${
                    link.href === '/promos' ? 'text-red-700' : 'text-coffee-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/favoritos"
                className="text-4xl font-semibold tracking-tightest text-coffee-900"
              >
                Favoritos{wishlistIds.length > 0 && ` (${wishlistIds.length})`}
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setSearchOpen(true);
                }}
                className="text-left text-4xl font-semibold tracking-tightest text-coffee-900"
              >
                Buscar
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  openCart();
                }}
                className="text-left text-4xl font-semibold tracking-tightest text-coffee-900"
              >
                Carrito{itemCount > 0 && ` (${itemCount})`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className="group relative py-1">
      <span className={active ? 'text-coffee-900' : 'text-coffee-700 group-hover:text-coffee-900'}>
        {children}
      </span>
      <span
        className={`absolute -bottom-0.5 left-0 h-px bg-coffee-900 transition-all duration-300 ${
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

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

type NavItem = { href: string; label: string; icon: React.ReactNode };

const NAV: NavItem[] = [
  { href: '/admin/orders', label: 'Pedidos', icon: <BagIcon /> },
  { href: '/admin/products', label: 'Productos', icon: <TagIcon /> },
  { href: '/admin/coupons', label: 'Cupones', icon: <TicketIcon /> },
  { href: '/admin/contenido', label: 'Contenido web', icon: <LayoutIcon /> },
  { href: '/admin/cuenta', label: 'Mi cuenta', icon: <UserIcon /> },
];
const SUPER_NAV: NavItem = { href: '/admin/settings', label: 'Configuración', icon: <GearIcon /> };

export default function AdminShell({
  email,
  isSuperAdmin,
  children,
}: {
  email?: string;
  isSuperAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = isSuperAdmin ? [...NAV, SUPER_NAV] : NAV;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-cream-50 md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-cream-200 bg-white/60 md:flex">
        <div className="flex items-center gap-2.5 px-5 pb-6 pt-6">
          <Logo className="h-4 w-auto text-coffee-900" />
          <span className="rounded-md bg-coffee-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cream-50">
            Admin
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3" aria-label="Panel">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-coffee-900 font-medium text-cream-50'
                    : 'text-coffee-700 hover:bg-cream-100 hover:text-coffee-900'
                }`}
              >
                <span className={active ? 'text-cream-50' : 'text-coffee-500'}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-cream-200 p-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-coffee-700 transition-colors hover:bg-cream-100 hover:text-coffee-900"
          >
            <span className="text-coffee-500">
              <ExternalIcon />
            </span>
            Ver tienda
          </a>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-coffee-700 transition-colors hover:bg-cream-100 hover:text-red-700"
          >
            <span className="text-coffee-500">
              <LogoutIcon />
            </span>
            Cerrar sesión
          </button>
          {email && <p className="truncate px-3 pt-2 text-[11px] text-coffee-400">{email}</p>}
        </div>
      </aside>

      {/* Mobile top bar: logo + actions, then a swipeable section row */}
      <header className="sticky top-0 z-30 border-b border-cream-200 bg-cream-50/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo className="h-3.5 w-auto text-coffee-900" />
            <span className="rounded bg-coffee-900 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-cream-50">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-1">
            <a href="/" target="_blank" rel="noreferrer" aria-label="Ver tienda" className="flex h-9 w-9 items-center justify-center rounded-full text-coffee-700 hover:bg-cream-100">
              <ExternalIcon />
            </a>
            <button type="button" onClick={logout} aria-label="Cerrar sesión" className="flex h-9 w-9 items-center justify-center rounded-full text-coffee-700 hover:bg-cream-100">
              <LogoutIcon />
            </button>
          </div>
        </div>
        <nav className="scrollbar-none flex gap-1.5 overflow-x-auto px-4 pb-3" aria-label="Panel">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
                  active ? 'bg-coffee-900 font-medium text-cream-50' : 'border border-cream-200 bg-white text-coffee-700'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
function BagIcon() {
  return <Svg><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></Svg>;
}
function TagIcon() {
  return <Svg><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.5" cy="8.5" r="1.3" /></Svg>;
}
function TicketIcon() {
  return <Svg><path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3v4Z" /><path d="M14 4v12" strokeDasharray="2 2" /></Svg>;
}
function LayoutIcon() {
  return <Svg><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></Svg>;
}
function UserIcon() {
  return <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></Svg>;
}
function GearIcon() {
  return <Svg><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></Svg>;
}
function ExternalIcon() {
  return <Svg><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" /></Svg>;
}
function LogoutIcon() {
  return <Svg><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></Svg>;
}

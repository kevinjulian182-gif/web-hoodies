import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

// The store lives on the main domain (wearafra.com) and the admin panel on
// its own subdomain (admin.wearafra.com). Any host starting with "admin."
// or "app." serves the panel. Sending /admin on the main domain over to the
// subdomain only starts once ADMIN_HOST is set (e.g. admin.wearafra.com in
// Vercel), so the panel keeps working until the subdomain's DNS is ready.
const ADMIN_HOST = process.env.ADMIN_HOST?.toLowerCase() || '';
const isAdminHost = (host: string) => host === ADMIN_HOST || /^(admin|app)\./.test(host);

// Paths the admin subdomain serves itself; everything else is the store.
const ADMIN_HOST_PATHS = /^\/(admin|login|voucher|api|_next|feeds|og-image)(\/|$)/;

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0];

  if (isAdminHost(host)) {
    if (pathname === '/') return NextResponse.redirect(new URL('/admin', req.url));
    if (!ADMIN_HOST_PATHS.test(pathname)) {
      // A store page opened on the admin subdomain: send it to the store.
      const mainHost = host.replace(/^(admin|app)\./, '');
      return NextResponse.redirect(new URL(`https://${mainHost}${pathname}${search}`));
    }
  } else if (ADMIN_HOST && /^\/(admin|login)(\/|$)/.test(pathname)) {
    return NextResponse.redirect(new URL(`https://${ADMIN_HOST}${pathname}${search}`));
  }

  if (!pathname.startsWith('/admin')) return NextResponse.next();

  const token = req.cookies.get('session')?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session || !ADMIN_ROLES.includes(session.role)) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin/settings') && session.role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except static assets, so the host rules apply to every page.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml).*)'],
};

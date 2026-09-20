import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
  matcher: ['/admin/:path*'],
};

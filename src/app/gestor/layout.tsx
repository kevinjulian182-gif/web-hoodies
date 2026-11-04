import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import GestorShell from './GestorShell';

export const metadata: Metadata = {
  title: 'Gestor de pedidos',
  robots: { index: false, follow: false },
};

// The order manager lives apart from the admin panel (its own link, its own
// header) but uses the same admin login, checked in proxy.ts.
export default async function GestorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session?.role !== 'ADMIN' && session?.role !== 'SUPER_ADMIN') redirect('/login?from=/gestor');
  return <GestorShell email={session?.email}>{children}</GestorShell>;
}

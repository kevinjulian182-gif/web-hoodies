import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AdminShell from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'Panel de administración',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session?.role !== 'ADMIN' && session?.role !== 'SUPER_ADMIN') redirect('/login?from=/admin');
  return (
    <AdminShell email={session?.email} isSuperAdmin={session?.role === 'SUPER_ADMIN'}>
      {children}
    </AdminShell>
  );
}

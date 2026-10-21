import type { Metadata } from 'next';
import { getSession } from '@/lib/auth';
import AdminShell from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'Panel de administración',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <AdminShell email={session?.email} isSuperAdmin={session?.role === 'SUPER_ADMIN'}>
      {children}
    </AdminShell>
  );
}

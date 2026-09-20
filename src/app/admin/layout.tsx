import Link from 'next/link';
import { getSession } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-r border-cream-200 bg-cream-50 p-6">
        <p className="text-sm font-semibold tracking-tightest text-coffee-900 mb-8">Panel Admin</p>
        <nav className="space-y-1 text-sm text-coffee-700">
          <Link href="/admin/products" className="block py-2 hover:text-coffee-900">
            Productos
          </Link>
          <Link href="/admin/orders" className="block py-2 hover:text-coffee-900">
            Pedidos
          </Link>
          <Link href="/admin/coupons" className="block py-2 hover:text-coffee-900">
            Cupones
          </Link>
          {session?.role === 'SUPER_ADMIN' && (
            <Link href="/admin/settings" className="block py-2 hover:text-coffee-900">
              Configuración
            </Link>
          )}
        </nav>
      </aside>
      <div className="flex-1 p-8">{children}</div>
    </div>
  );
}

'use client';

import { usePathname } from 'next/navigation';

// Store chrome (header, footer, cart drawer, WhatsApp bubble, cursor) stays
// out of the admin panel and the order manager, which have their own.
const BACK_OFFICE = /^\/(admin|gestor)(\/|$)/;

export default function StorefrontOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (BACK_OFFICE.test(pathname)) return null;
  return <>{children}</>;
}

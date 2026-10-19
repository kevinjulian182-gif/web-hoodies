'use client';

import { usePathname } from 'next/navigation';

// Store chrome (header, footer, cart drawer, WhatsApp bubble, cursor) stays
// out of the admin panel, which has its own navigation.
export default function StorefrontOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return <>{children}</>;
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Guía de envío',
  robots: { index: false, follow: false },
};

export default function VoucherLayout({ children }: { children: React.ReactNode }) {
  return children;
}

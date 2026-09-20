import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'AFRA — Streetwear de lujo',
  description: 'Hoodies, sudaderas y chaquetas de las marcas más exclusivas.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <CartProvider>
          <Navbar />
          <main>{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}

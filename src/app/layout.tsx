import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import { WishlistProvider } from '@/lib/wishlist';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageTransition from '@/components/PageTransition';
import CartDrawer from '@/components/CartDrawer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { getSiteContent } from '@/lib/content';

export const metadata: Metadata = {
  title: 'AFRA — Streetwear de lujo',
  description: 'Hoodies, sudaderas y chaquetas de las marcas más exclusivas.',
};

// The footer pulls its tagline from the editable SiteContent table on every
// request; without this, Next would bake it into the static HTML at build
// time and admin edits to it would never show up without a redeploy.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const content = await getSiteContent();

  return (
    <html lang="es">
      <body>
        <CartProvider>
          <WishlistProvider>
            <Navbar />
            <main>
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer tagline={content['footer.tagline']} />
            <CartDrawer />
            <WhatsAppButton />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}

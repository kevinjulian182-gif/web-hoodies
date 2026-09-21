import type { Metadata } from 'next';
import { Montserrat, Cormorant } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import { WishlistProvider } from '@/lib/wishlist';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageTransition from '@/components/PageTransition';
import CartDrawer from '@/components/CartDrawer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { getSiteContent } from '@/lib/content';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const cormorant = Cormorant({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

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
    <html lang="es" className={`${montserrat.variable} ${cormorant.variable}`}>
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

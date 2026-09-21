import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import { WishlistProvider } from '@/lib/wishlist';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageTransition from '@/components/PageTransition';
import CartDrawer from '@/components/CartDrawer';
import WhatsAppButton from '@/components/WhatsAppButton';
import CustomCursor from '@/components/CustomCursor';
import { getSiteContent } from '@/lib/content';

// The footer pulls its tagline from the editable SiteContent table on every
// request; without this, Next would bake it into the static HTML at build
// time and admin edits to it would never show up without a redeploy.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: content['site.title'],
    description: content['site.description'],
    icons: content['site.favicon_url'] ? { icon: content['site.favicon_url'] } : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const content = await getSiteContent();

  return (
    <html lang="es">
      <body>
        <CartProvider>
          <WishlistProvider>
            <Navbar logoUrl={content['site.logo_url'] || undefined} />
            <main>
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer tagline={content['footer.tagline']} />
            <CartDrawer />
            <WhatsAppButton />
            <CustomCursor />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}

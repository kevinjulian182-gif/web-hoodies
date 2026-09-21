import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import { WishlistProvider } from '@/lib/wishlist';
import { CatalogSettingsProvider } from '@/lib/catalogSettings';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageTransition from '@/components/PageTransition';
import CartDrawer from '@/components/CartDrawer';
import WhatsAppButton from '@/components/WhatsAppButton';
import CustomCursor from '@/components/CustomCursor';
import { getSiteContent, getHomeSectionOrder, getHeroImages } from '@/lib/content';

// The footer pulls its tagline from the editable SiteContent table on every
// request; without this, Next would bake it into the static HTML at build
// time and admin edits to it would never show up without a redeploy.
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FDFCFA' },
    { media: '(prefers-color-scheme: dark)', color: '#1C1611' },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: content['site.title'],
    description: content['site.description'],
    icons: content['site.favicon_url'] ? { icon: content['site.favicon_url'] } : undefined,
    openGraph: {
      siteName: 'AFRA',
      title: content['site.title'],
      description: content['site.description'],
      locale: 'es_CO',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: content['site.title'],
      description: content['site.description'],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const content = await getSiteContent();
  const heroIsFirstAndDark =
    getHomeSectionOrder(content)[0] === 'hero' &&
    (Boolean(content['hero.video_url']) || getHeroImages(content).length > 0);

  return (
    <html lang="es">
      <body>
        <CartProvider>
          <WishlistProvider>
            <CatalogSettingsProvider
              showColors={content['catalog.show_colors_on_card'] === 'true'}
              showSizes={content['catalog.show_sizes_on_card'] === 'true'}
            >
              <Navbar
                logoUrl={content['site.logo_url'] || undefined}
                transparentOverHero={heroIsFirstAndDark}
                social={{
                  instagramUrl: content['social.instagram_url'] || undefined,
                  tiktokUrl: content['social.tiktok_url'] || undefined,
                  facebookUrl: content['social.facebook_url'] || undefined,
                  xUrl: content['social.x_url'] || undefined,
                }}
              />
              <main>
                <PageTransition>{children}</PageTransition>
              </main>
              <Footer
                tagline={content['footer.tagline']}
                copyrightYear={content['footer.copyright_year']}
                social={{
                  instagramUrl: content['social.instagram_url'] || undefined,
                  tiktokUrl: content['social.tiktok_url'] || undefined,
                  facebookUrl: content['social.facebook_url'] || undefined,
                  xUrl: content['social.x_url'] || undefined,
                }}
              />
              <CartDrawer />
              <WhatsAppButton />
              <CustomCursor />
            </CatalogSettingsProvider>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}

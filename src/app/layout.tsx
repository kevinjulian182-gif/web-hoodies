import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import { WishlistProvider } from '@/lib/wishlist';
import { CatalogSettingsProvider } from '@/lib/catalogSettings';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageTransition from '@/components/PageTransition';
import HydrationFlag from '@/components/HydrationFlag';
import StorefrontOnly from '@/components/StorefrontOnly';
import CartDrawer from '@/components/CartDrawer';
import WhatsAppButton from '@/components/WhatsAppButton';
import CustomCursor from '@/components/CustomCursor';
import {
  getSiteContent,
  getHomeSectionOrder,
  getHeroImages,
  getFreeShippingThresholdCents,
  getShippingRates,
} from '@/lib/content';
import { generateThemeVars, themeVarsToCss } from '@/lib/theme';
import { getStoreWhatsAppNumber } from '@/lib/whatsapp';

// This layout wraps every page in the app, and a force-dynamic ancestor
// forces every descendant page dynamic too regardless of its own config —
// so leaving this static (the default) is what lets individual pages below
// be cached at all. The SiteContent it reads only ever changes when an
// admin explicitly saves, and every admin route that touches it calls
// revalidatePath (see src/lib/revalidate.ts), so the cache never goes
// stale in a way a visitor would notice — it's invalidated the moment an
// edit is saved, not after some arbitrary time window.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  // The store is designed light-only: "only light" tells Chrome (Android
  // auto-dark), Samsung Internet and Safari not to invert or darken it, and
  // the browser chrome stays cream even when the phone is in dark mode.
  colorScheme: 'only light',
  themeColor: '#FDFCFA',
};

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: content['site.title'],
    description: content['site.description'],
    icons: { icon: content['site.favicon_url'] || '/icon.svg', apple: '/apple-icon.png' },
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
  const themeCss = themeVarsToCss(generateThemeVars(content['theme.coffee_color'], content['theme.cream_color']));
  const whatsappNumber = getStoreWhatsAppNumber(content);

  return (
    <html lang="es">
      <body>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        <CartProvider>
          <WishlistProvider>
            <CatalogSettingsProvider
              showColors={content['catalog.show_colors_on_card'] === 'true'}
              showSizes={content['catalog.show_sizes_on_card'] === 'true'}
              freeShippingThresholdCents={getFreeShippingThresholdCents(content)}
              shippingRates={getShippingRates(content)}
            >
              <StorefrontOnly>
                <Navbar
                  logoUrl={content['site.logo_url'] || undefined}
                  transparentOverHero={heroIsFirstAndDark}
                  whatsappNumber={whatsappNumber}
                  social={{
                    instagramUrl: content['social.instagram_url'] || undefined,
                    tiktokUrl: content['social.tiktok_url'] || undefined,
                    facebookUrl: content['social.facebook_url'] || undefined,
                    xUrl: content['social.x_url'] || undefined,
                  }}
                />
              </StorefrontOnly>
              <main>
                <PageTransition>{children}</PageTransition>
              </main>
              <StorefrontOnly>
                <Footer
                  tagline={content['footer.tagline']}
                  copyrightYear={content['footer.copyright_year']}
                  whatsappNumber={whatsappNumber}
                  social={{
                    instagramUrl: content['social.instagram_url'] || undefined,
                    tiktokUrl: content['social.tiktok_url'] || undefined,
                    facebookUrl: content['social.facebook_url'] || undefined,
                    xUrl: content['social.x_url'] || undefined,
                  }}
                />
                <CartDrawer whatsappNumber={whatsappNumber} />
                <WhatsAppButton number={whatsappNumber} />
                <CustomCursor />
              </StorefrontOnly>
              <HydrationFlag />
            </CatalogSettingsProvider>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}

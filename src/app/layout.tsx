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
import MetaPixel from '@/components/MetaPixel';
import { SITE_URL } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';
import { RETURN_POLICY } from '@/lib/legal';
import CookieConsent from '@/components/CookieConsent';
import CartDrawer from '@/components/CartDrawer';
import WhatsAppButton from '@/components/WhatsAppButton';
import CustomCursor from '@/components/CustomCursor';
import {
  getSiteContent,
  getHomeSectionOrder,
  getHeroImages,
  getFreeShippingThresholdCents,
  getShippingRates,
  getLegalInfo,
} from '@/lib/content';
import { generateThemeVars, themeVarsToCss } from '@/lib/theme';
import { getStoreWhatsAppNumber } from '@/lib/whatsapp';
import AnalyticsTracker from '@/components/AnalyticsTracker';

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
  // Version the share image by the uploaded file so networks refetch it
  // after it changes in the admin.
  const ogImage = `/og-image?v=${encodeURIComponent((content['site.og_image'] || 'default').slice(-24))}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: content['site.title'], template: '%s | AFRA' },
    description: content['site.description'],
    applicationName: 'AFRA',
    icons: { icon: content['site.favicon_url'] || '/icon.svg', apple: '/apple-icon.png' },
    openGraph: {
      siteName: 'AFRA',
      title: content['site.title'],
      description: content['site.description'],
      locale: 'es_CO',
      type: 'website',
      url: SITE_URL,
      images: [{ url: ogImage, width: 1200, height: 630, alt: 'AFRA — streetwear de marca en Colombia' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: content['site.title'],
      description: content['site.description'],
      images: [ogImage],
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
  const legal = getLegalInfo(content);
  const sameAs = ['social.instagram_url', 'social.tiktok_url', 'social.facebook_url', 'social.x_url']
    .map((k) => content[k as keyof typeof content])
    .filter(Boolean);
  const siteLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'OnlineStore',
        '@id': `${SITE_URL}/#organization`,
        name: 'AFRA',
        ...(legal.name !== 'AFRA' ? { legalName: legal.name } : {}),
        ...(legal.nit ? { taxID: legal.nit } : {}),
        url: SITE_URL,
        logo: `${SITE_URL}/apple-icon.png`,
        description: content['site.description'],
        ...(sameAs.length ? { sameAs } : {}),
        address: { '@type': 'PostalAddress', addressLocality: 'Bogotá', addressCountry: 'CO' },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          areaServed: 'CO',
          availableLanguage: 'es',
          ...(legal.phone ? { telephone: legal.phone } : {}),
          ...(legal.email ? { email: legal.email } : {}),
        },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'CO',
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: RETURN_POLICY.withdrawalBusinessDays,
          returnMethod: 'https://schema.org/ReturnByMail',
          returnFees: 'https://schema.org/ReturnShippingFees',
          merchantReturnLink: `${SITE_URL}/reembolsos`,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: 'AFRA',
        url: SITE_URL,
        inLanguage: 'es-CO',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <html lang="es">
      <head>
        {/* Meta Pixel: one copy, loaded from /meta-pixel.js (see that route). */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/meta-pixel.js" />
      </head>
      <body>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        <JsonLd data={siteLd} />
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
                <MetaPixel />
                <CookieConsent />
                <AnalyticsTracker />
              </StorefrontOnly>
              <HydrationFlag />
            </CatalogSettingsProvider>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}

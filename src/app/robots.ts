import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private or transactional pages. /feeds stays open: Google Merchant
        // and Meta fetch the catalogs and product photos from there.
        disallow: ['/admin', '/api/', '/checkout', '/voucher/', '/favoritos', '/login'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

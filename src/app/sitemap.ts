import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { SITE_URL, jpgImage } from '@/lib/seo';

// Every public, indexable page: static pages, active products (with their
// main photo for Google Images) and blog posts.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, posts] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true, images: true } }),
    prisma.blogPost.findMany({ select: { slug: true, publishedAt: true } }),
  ]);
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/productos`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/promos`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/nosotros`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/blog`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/terminos`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/reembolsos`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacidad`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/cookies`, changeFrequency: 'yearly', priority: 0.1 },
  ];

  return [
    ...pages,
    ...products.map((p) => ({
      url: `${SITE_URL}/productos/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      images: p.images.slice(0, 3).map(jpgImage),
    })),
    ...posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.publishedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}

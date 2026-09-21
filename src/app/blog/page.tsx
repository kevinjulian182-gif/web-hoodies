import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog — AFRA',
  description: 'Guías de cuidado, autenticidad e historia del streetwear que vendemos.',
};

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({ orderBy: { publishedAt: 'desc' } });

  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <h1 className="font-display text-5xl md:text-6xl font-semibold italic text-coffee-900">Blog</h1>
      <p className="mt-3 text-coffee-600 max-w-xl">
        Guías de cuidado, autenticidad e historia detrás de las marcas que vendemos.
      </p>

      <div className="mt-14 grid gap-12 md:grid-cols-2">
        {posts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-cream-100">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <p className="mt-4 text-xs uppercase tracking-wide text-coffee-500">
              {new Date(post.publishedAt).toLocaleDateString('es-CO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tightest text-coffee-900 group-hover:text-coffee-700 transition-colors">
              {post.title}
            </h2>
            <p className="mt-2 text-sm text-coffee-600 leading-relaxed">{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

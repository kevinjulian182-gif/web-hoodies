import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) return { title: 'Blog — AFRA' };
  return { title: `${post.title} — AFRA`, description: post.excerpt };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) notFound();

  // Posts written before the rich-text editor stored plain text with blank
  // lines between paragraphs; posts written since store real HTML. Detect
  // which this is rather than migrating old rows, since both need to keep
  // rendering correctly forever.
  const isHtml = /<[a-z][\s\S]*>/i.test(post.content);
  const paragraphs = isHtml ? [] : post.content.split('\n\n');

  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <Link href="/blog" className="text-sm text-coffee-500 hover:text-coffee-900 transition-colors">
        ← Volver al blog
      </Link>

      <p className="mt-8 text-xs uppercase tracking-wide text-coffee-500">
        {new Date(post.publishedAt).toLocaleDateString('es-CO', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
      <h1 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tightest text-coffee-900 leading-[1.1]">
        {post.title}
      </h1>

      <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-2xl bg-cream-100">
        <Image src={post.coverImage} alt={post.title} fill className="object-cover" sizes="768px" priority />
      </div>

      {isHtml ? (
        <div className="blog-content mt-10 text-coffee-700" dangerouslySetInnerHTML={{ __html: post.content }} />
      ) : (
        <div className="mt-10 space-y-6">
          {paragraphs.map((paragraph, i) => (
            <p key={i} className="text-coffee-700 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </article>
  );
}

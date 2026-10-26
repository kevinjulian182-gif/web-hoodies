import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { revalidateBlogListing, revalidateBlogPost } from '@/lib/revalidate';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  excerpt: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  coverImage: z.string().url().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const before = await prisma.blogPost.findUnique({ where: { id }, select: { slug: true } });
  const post = await prisma.blogPost.update({ where: { id }, data: parsed.data });
  revalidateBlogListing();
  revalidateBlogPost(post.slug);
  if (before && before.slug !== post.slug) revalidateBlogPost(before.slug);
  return NextResponse.json(post);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const deleted = await prisma.blogPost.delete({ where: { id } });
  revalidateBlogListing();
  revalidateBlogPost(deleted.slug);
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(coupons);
}

const schema = z.object({
  code: z.string().min(3).toUpperCase(),
  discountType: z.enum(['PERCENT', 'FIXED']),
  value: z.number().int().positive(),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const coupon = await prisma.coupon.create({
    data: {
      ...parsed.data,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });
  return NextResponse.json(coupon, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const schema = z.object({ code: z.string().trim().min(1).max(40) });

// Lets the checkout preview a coupon before the order is placed. Only the
// terms are returned; the discount itself is recomputed server-side when the
// order is created, so nothing here can be trusted into a lower charge.
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Escribe un código.' }, { status: 400 });
  }
  const code = parsed.data.code.toUpperCase();
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) {
    return NextResponse.json({ error: 'Este cupón no existe o ya no está activo.' }, { status: 404 });
  }
  if (coupon.expiresAt && coupon.expiresAt <= new Date()) {
    return NextResponse.json({ error: 'Este cupón ya venció.' }, { status: 410 });
  }
  return NextResponse.json({ code, discountType: coupon.discountType, value: coupon.value });
}

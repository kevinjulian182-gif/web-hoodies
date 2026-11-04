import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureAnalyticsTable } from '@/lib/analyticsServer';

const schema = z.object({
  sessionId: z.string().uuid(),
  name: z.enum([
    'page_view',
    'view_product',
    'add_to_cart',
    'begin_checkout',
    'checkout_step',
    'checkout_error',
    'purchase',
    'whatsapp_order',
  ]),
  path: z.string().max(300).optional(),
  productId: z.string().max(40).optional(),
  step: z.number().int().min(1).max(10).optional(),
  detail: z.string().max(200).optional(),
  value: z.number().int().min(0).max(1_000_000_000).optional(),
});

const RETENTION_DAYS = 180;
let lastPurge = 0;

export async function POST(req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? '';
  if (/bot|crawler|spider|preview|facebookexternalhit|headless/i.test(ua)) return new NextResponse(null, { status: 204 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  try {
    await ensureAnalyticsTable();
    await prisma.analyticsEvent.create({
      data: { ...parsed.data, device: /mobi|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop' },
    });
    // Old events are dropped (no need to keep behavior data forever).
    if (Date.now() - lastPurge > 6 * 60 * 60 * 1000) {
      lastPurge = Date.now();
      await prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - RETENTION_DAYS * 864e5) } } });
    }
  } catch (err) {
    console.error('No se pudo guardar el evento de analítica:', err);
  }
  return new NextResponse(null, { status: 204 });
}

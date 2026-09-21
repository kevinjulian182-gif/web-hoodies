import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';

const schema = z.object({
  trackingNumber: z.string().min(1),
  carrier: z.string().min(1).default('Inter Rapidísimo'),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const order = await prisma.order.update({
    where: { id },
    data: {
      trackingNumber: parsed.data.trackingNumber,
      carrier: parsed.data.carrier,
      status: 'SHIPPED',
      shippedAt: new Date(),
    },
  });

  return NextResponse.json(order);
}

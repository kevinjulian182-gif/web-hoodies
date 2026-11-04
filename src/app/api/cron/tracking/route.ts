import { NextRequest, NextResponse } from 'next/server';
import { refreshShippedOrders } from '@/lib/tracking';

// Daily Vercel cron (vercel.json): updates every shipped guía and marks the
// delivered ones. Vercel signs the call with CRON_SECRET when it's set.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? req.headers.get('authorization') === `Bearer ${secret}`
    : (req.headers.get('user-agent') ?? '').startsWith('vercel-cron');
  if (!authorized) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return NextResponse.json(await refreshShippedOrders(360));
}

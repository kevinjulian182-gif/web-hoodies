import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireRole } from '@/lib/auth';
import { getConfigValue } from '@/lib/config';
import { getLastWompiWebhook } from '@/lib/wompiPayments';

// What the panel needs to tell whether Wompi payments can reach the store.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!requireRole(session, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const [publicKey, privateKey, integrity, events, lastWebhook] = await Promise.all([
    getConfigValue('WOMPI_PUBLIC_KEY'),
    getConfigValue('WOMPI_PRIVATE_KEY'),
    getConfigValue('WOMPI_INTEGRITY_SECRET'),
    getConfigValue('WOMPI_EVENTS_SECRET'),
    getLastWompiWebhook(),
  ]);
  const pub = publicKey?.trim() ?? '';
  const prv = privateKey?.trim() ?? '';
  // The webhook lives on the store domain, not the admin subdomain.
  const host = (req.headers.get('host') ?? 'wearafra.com').replace(/^(admin|app)\./, '');
  const origin = host.startsWith('localhost') ? `http://${host}` : `https://${host}`;
  return NextResponse.json({
    mode: !pub ? null : pub.startsWith('pub_test_') ? 'test' : 'production',
    keys: {
      publicKey: Boolean(pub),
      privateKey: Boolean(prv),
      integrity: Boolean(integrity?.trim()),
      events: Boolean(events?.trim()),
    },
    keysMatch: !pub || !prv || pub.startsWith('pub_test_') === prv.startsWith('prv_test_'),
    webhookUrl: `${origin}/api/webhooks/wompi`,
    lastWebhook,
  });
}

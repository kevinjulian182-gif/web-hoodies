import crypto from 'crypto';
import { getConfigValue } from '@/lib/config';

/** Wompi checkout widget requires a SHA256 integrity signature per transaction. */
export async function buildWompiSignature(reference: string, amountInCents: number, currency: string) {
  const integritySecret = await getConfigValue('WOMPI_INTEGRITY_SECRET');
  if (!integritySecret) throw new Error('WOMPI_INTEGRITY_SECRET no configurado');
  const raw = `${reference}${amountInCents}${currency}${integritySecret}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function getWompiPublicKey() {
  const key = await getConfigValue('WOMPI_PUBLIC_KEY');
  if (!key) throw new Error('WOMPI_PUBLIC_KEY no configurado');
  return key;
}

type WompiEvent = {
  event: string;
  data: { transaction: Record<string, unknown> & { id: string; status: string; reference: string } };
  signature: { properties: string[]; checksum: string };
  timestamp: number;
};

/** Verifies the webhook checksum Wompi sends: SHA256 of the referenced property values + timestamp + events secret. */
export async function verifyWompiWebhook(event: WompiEvent): Promise<boolean> {
  const eventsSecret = await getConfigValue('WOMPI_EVENTS_SECRET');
  if (!eventsSecret) return false;

  const values = event.signature.properties.map((path) => {
    const parts = path.split('.').slice(1); // drop leading "transaction"
    let node: unknown = event.data.transaction;
    for (const part of parts) node = (node as Record<string, unknown>)[part];
    return String(node);
  });

  const raw = `${values.join('')}${event.timestamp}${eventsSecret}`;
  const expected = crypto.createHash('sha256').update(raw).digest('hex');
  return expected === event.signature.checksum;
}

export function generateOrderReference() {
  return `HOODIES-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

import crypto from 'crypto';
import { getConfigValue } from '@/lib/config';

/** Wompi checkout widget requires a SHA256 integrity signature per transaction. */
export async function buildWompiSignature(reference: string, amountInCents: number, currency: string) {
  const integritySecret = (await getConfigValue('WOMPI_INTEGRITY_SECRET'))?.trim();
  if (!integritySecret) throw new Error('WOMPI_INTEGRITY_SECRET no configurado');
  const raw = `${reference}${amountInCents}${currency}${integritySecret}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function getWompiPublicKey() {
  const key = (await getConfigValue('WOMPI_PUBLIC_KEY'))?.trim();
  if (!key) throw new Error('WOMPI_PUBLIC_KEY no configurado');
  return key;
}

/** Test keys (pub_test_/prv_test_) talk to the sandbox, production keys to production. */
export function wompiApiBase(publicKey: string) {
  return publicKey.startsWith('pub_test_') ? 'https://sandbox.wompi.co/v1' : 'https://production.wompi.co/v1';
}

export type WompiTransaction = { id: string; status: string; reference: string; amount_in_cents?: number };

/** A transaction as Wompi has it, by id. Public endpoint: only the public key decides the environment. */
export async function fetchWompiTransaction(id: string): Promise<WompiTransaction | null> {
  const base = wompiApiBase(await getWompiPublicKey());
  const res = await fetch(`${base}/transactions/${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return ((await res.json()).data as WompiTransaction) ?? null;
}

/** The latest transaction Wompi has for one of our references (needs the private key). */
export async function findWompiTransactionByReference(reference: string): Promise<WompiTransaction | null> {
  const privateKey = (await getConfigValue('WOMPI_PRIVATE_KEY'))?.trim();
  if (!privateKey) throw new Error('Falta la llave privada de Wompi (Configuración).');
  const base = wompiApiBase(await getWompiPublicKey());
  const res = await fetch(`${base}/transactions?reference=${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${privateKey}` },
    cache: 'no-store',
  });
  if (res.status === 401) throw new Error('Wompi rechazó la llave privada. Revisa que sea del mismo ambiente que la pública.');
  if (!res.ok) throw new Error(`Wompi respondió ${res.status}.`);
  const list = ((await res.json()).data ?? []) as (WompiTransaction & { created_at?: string })[];
  // An approved attempt wins over later declined retries of the same reference.
  return list.find((t) => t.status === 'APPROVED') ?? list[0] ?? null;
}

export type WompiEvent = {
  event: string;
  data: { transaction: Record<string, unknown> & { id: string; status: string; reference: string } };
  signature: { properties: string[]; checksum: string };
  timestamp: number;
};

/** Verifies the webhook checksum Wompi sends: SHA256 of the referenced property values + timestamp + events secret. */
export async function verifyWompiWebhook(event: WompiEvent): Promise<boolean> {
  const eventsSecret = (await getConfigValue('WOMPI_EVENTS_SECRET'))?.trim();
  if (!eventsSecret || !event?.signature?.properties || !event.data?.transaction) return false;

  const values = event.signature.properties.map((path) => {
    const parts = path.split('.').slice(1); // drop leading "transaction"
    let node: unknown = event.data.transaction;
    for (const part of parts) node = (node as Record<string, unknown> | undefined)?.[part];
    return String(node);
  });

  const raw = `${values.join('')}${event.timestamp}${eventsSecret}`;
  const expected = crypto.createHash('sha256').update(raw).digest('hex');
  // Wompi sends the checksum in uppercase hex; Node's digest is lowercase.
  return expected === String(event.signature.checksum).toLowerCase();
}

export function generateOrderReference() {
  return `AFRA-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

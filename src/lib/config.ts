import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const ALGO = 'aes-256-gcm';

function encryptionKey() {
  const raw = process.env.CONFIG_ENCRYPTION_KEY ?? 'dev-encryption-key-32-bytes-long!';
  return crypto.createHash('sha256').update(raw).digest();
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(payload: string) {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

/** System-wide settings only a Super Admin manages (payment/shipping API keys). */
export const CONFIG_KEYS = [
  'WOMPI_PUBLIC_KEY',
  'WOMPI_PRIVATE_KEY',
  'WOMPI_INTEGRITY_SECRET',
  'WOMPI_EVENTS_SECRET',
  'INTER_RAPIDISIMO_API_KEY',
  'RESEND_API_KEY',
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

export async function getConfigValue(key: ConfigKey): Promise<string | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (row) return decrypt(row.value);
  return process.env[key] ?? null;
}

export async function setConfigValue(key: ConfigKey, value: string) {
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value: encrypt(value) },
    update: { value: encrypt(value) },
  });
}

export async function getAllConfigMasked(): Promise<Record<ConfigKey, string>> {
  const rows = await prisma.systemConfig.findMany();
  const stored = new Set(rows.map((r) => r.key));
  const result = {} as Record<ConfigKey, string>;
  for (const key of CONFIG_KEYS) {
    result[key] = stored.has(key) ? '••••••••' : '';
  }
  return result;
}

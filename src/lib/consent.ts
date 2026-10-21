import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LEGAL_VERSION } from '@/lib/legal';

export type ConsentSource = 'checkout' | 'whatsapp_order' | 'newsletter' | 'cookies';

// Same DDL `prisma db push` would produce for the ConsentRecord model, run
// once per server instance so production needs no manual migration.
const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS "ConsentRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "reference" TEXT,
    "acceptedTerms" BOOLEAN NOT NULL DEFAULT false,
    "acceptedPrivacy" BOOLEAN NOT NULL DEFAULT false,
    "cookies" TEXT,
    "legalVersion" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
)`;

let tableReady: Promise<void> | null = null;

export function ensureConsentTable(): Promise<void> {
  tableReady ??= (async () => {
    await prisma.$executeRawUnsafe(CREATE_TABLE);
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "ConsentRecord_email_idx" ON "ConsentRecord"("email")');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "ConsentRecord_createdAt_idx" ON "ConsentRecord"("createdAt")');
  })().catch((err) => {
    tableReady = null; // retry on the next call
    throw err;
  });
  return tableReady;
}

export function requestMeta(req: NextRequest) {
  return {
    ip: (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || null,
    userAgent: req.headers.get('user-agent')?.slice(0, 400) ?? null,
  };
}

/** Stores proof of an acceptance. Never throws: a logging failure must not
 * block an order — it's reported in the server logs instead. */
export async function recordConsent(
  req: NextRequest,
  data: {
    source: ConsentSource;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    reference?: string | null;
    acceptedTerms?: boolean;
    acceptedPrivacy?: boolean;
    cookies?: string | null;
  }
): Promise<void> {
  try {
    await ensureConsentTable();
    await prisma.consentRecord.create({
      data: {
        source: data.source,
        email: data.email?.trim().toLowerCase() || null,
        name: data.name?.trim() || null,
        phone: data.phone?.trim() || null,
        reference: data.reference ?? null,
        acceptedTerms: Boolean(data.acceptedTerms),
        acceptedPrivacy: Boolean(data.acceptedPrivacy),
        cookies: data.cookies ?? null,
        legalVersion: LEGAL_VERSION,
        ...requestMeta(req),
      },
    });
  } catch (err) {
    console.error('No se pudo guardar el registro de consentimiento:', err);
  }
}

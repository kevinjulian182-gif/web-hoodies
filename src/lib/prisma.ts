import { PrismaClient } from '@prisma/client';

// Serverless functions can each spin up their own PrismaClient, and every
// client opens its own small connection pool against Supabase's PgBouncer.
// Without capping it, concurrent invocations (e.g. two page navigations in
// a row) exhaust the pooler's connection slots — later requests then just
// hang until a connection frees up, which looks like "nothing loads until
// I reload the page." Prisma's own guidance for PgBouncer + serverless is
// to cap each client to a single connection.
function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.includes('pgbouncer=true') || url.includes('connection_limit=')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}connection_limit=1`;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createDefaultClient>;
  prismaInternal?: PrismaClient;
};

function createDefaultClient() {
  // costCents is the product's purchase/manufacturing cost — internal-only
  // data used for margin calculations. Every public-facing page (storefront,
  // search, checkout) reads products through this client, which fetches rows
  // via plain server-side Prisma calls and passes them straight through as
  // page props, so omitting the field here (rather than per-query) is what
  // actually keeps it out of the HTML/JSON sent to shoppers.
  return new PrismaClient({
    datasources: { db: { url: databaseUrl() } },
    omit: { product: { costCents: true } },
  });
}

export const prisma = globalForPrisma.prisma ?? createDefaultClient();

// Full-field client for the few admin-only code paths that need to read
// costCents back (inventory list, Excel export, product duplication).
export const prismaInternal =
  globalForPrisma.prismaInternal ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl() } },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaInternal = prismaInternal;
}

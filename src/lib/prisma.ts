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

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl() } },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

import { prisma } from '@/lib/prisma';

// Same DDL `prisma db push` would produce for AnalyticsEvent, run once per
// server instance so production needs no manual migration.
let ready: Promise<void> | null = null;

export function ensureAnalyticsTable(): Promise<void> {
  ready ??= (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
        "id" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "sessionId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "path" TEXT,
        "productId" TEXT,
        "step" INTEGER,
        "detail" TEXT,
        "value" INTEGER,
        "device" TEXT,
        CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
      )`);
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt")');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId")');
  })().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

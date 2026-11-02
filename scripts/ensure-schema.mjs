// Idempotent schema changes applied on every build (Vercel builds already
// reach the database to prerender pages), so a deploy never needs a manual
// SQL step. Every statement must be safe to run again.
import { PrismaClient } from '@prisma/client';

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.log('ensure-schema: no database URL, skipping');
  process.exit(0);
}

const STATEMENTS = [
  `ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED' BEFORE 'CANCELLED'`,
  `ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'TRANSFER'`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3)`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingStatus" TEXT`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingCheckedAt" TIMESTAMP(3)`,
];

const prisma = new PrismaClient({ datasources: { db: { url } } });
try {
  for (const sql of STATEMENTS) await prisma.$executeRawUnsafe(sql);
  console.log(`ensure-schema: ${STATEMENTS.length} statements applied`);
} catch (err) {
  // Fail the build: the app's queries expect these columns to exist.
  console.error(`ensure-schema failed: ${err.message.split('\n').filter(Boolean).pop()}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

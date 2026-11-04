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
  // Cuentas: merchandise purchases and other money in/out.
  `CREATE TABLE IF NOT EXISTS "Purchase" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "supplier" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "paymentMethod" TEXT NOT NULL,
    "notes" TEXT,
    "totalCents" INTEGER NOT NULL,
    "addedToStock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCostCents" INTEGER NOT NULL,
    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "LedgerEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "Purchase_date_idx" ON "Purchase"("date")`,
  `CREATE INDEX IF NOT EXISTS "LedgerEntry_date_idx" ON "LedgerEntry"("date")`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseItem_purchaseId_fkey') THEN
      ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  // Who paid each expense/purchase, and fiados (credit orders) with their abonos.
  `ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "paidBy" TEXT`,
  `ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "paidBy" TEXT`,
  `ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "orderId" TEXT`,
  `CREATE INDEX IF NOT EXISTS "Purchase_orderId_idx" ON "Purchase"("orderId")`,
  `ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CREDIT'`,
  `CREATE TABLE IF NOT EXISTS "CreditPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "receivedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditPayment_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "CreditPayment_orderId_idx" ON "CreditPayment"("orderId")`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CreditPayment_orderId_fkey') THEN
      ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
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

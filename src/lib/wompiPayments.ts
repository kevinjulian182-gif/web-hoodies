import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getConfigValue, setConfigValue } from '@/lib/config';
import { notifyOrderConfirmed } from '@/lib/orderNotify';
import { orderHoldsStock, releaseOrderStock, takeOrderStock } from '@/lib/stock';
import { revalidateProductListings, revalidateProduct } from '@/lib/revalidate';
import type { WompiTransaction } from '@/lib/wompi';

export type ApplyResult = { found: boolean; status?: string; changed: boolean };

/** Brings one of our orders in line with what Wompi says about its payment.
 * Shared by the webhook, the return page and the admin's "verify" button,
 * so whichever arrives first settles the order and the rest are no-ops. */
export async function applyWompiTransaction(transaction: WompiTransaction): Promise<ApplyResult> {
  const order = await prisma.order.findUnique({
    where: { wompiReference: transaction.reference },
    include: { items: { include: { product: { include: { variants: true } } } } },
  });
  if (!order) return { found: false, changed: false };

  // A paid order whose reservation had already been released (declined
  // retry, or left past the hold window) takes its units again.
  if (transaction.status === 'APPROVED' && (order.status === 'PENDING' || order.status === 'CANCELLED')) {
    const holds = orderHoldsStock(order);
    const { count } = await prisma.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: 'PAID', wompiTransactionId: transaction.id },
    });
    if (count === 1) {
      const slugs = holds ? [] : await takeOrderStock(order.id);
      if (slugs.length) {
        revalidateProductListings();
        for (const slug of new Set(slugs)) revalidateProduct(slug);
      }
      // A Wompi order only counts once it's paid — that's when the store hears about it.
      after(() => notifyOrderConfirmed(order));
      return { found: true, status: 'PAID', changed: true };
    }
  } else if ((transaction.status === 'DECLINED' || transaction.status === 'ERROR' || transaction.status === 'VOIDED') && order.status === 'PENDING') {
    const holds = orderHoldsStock(order);
    const { count } = await prisma.order.updateMany({
      where: { id: order.id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    if (count === 1 && holds) {
      const slugs = await releaseOrderStock(order.id);
      revalidateProductListings();
      for (const slug of new Set(slugs)) revalidateProduct(slug);
    }
    if (count === 1) return { found: true, status: 'CANCELLED', changed: true };
  }

  const current = await prisma.order.findUnique({ where: { id: order.id }, select: { status: true } });
  return { found: true, status: current?.status, changed: false };
}

export type WebhookLog = { at: string; ok: boolean; reference?: string; status?: string; detail: string };

/** Keeps the last webhook Wompi sent, so the panel can show whether they arrive. */
export async function logWompiWebhook(log: Omit<WebhookLog, 'at'>) {
  await setConfigValue('WOMPI_LAST_WEBHOOK', JSON.stringify({ ...log, at: new Date().toISOString() })).catch(() => {});
}

export async function getLastWompiWebhook(): Promise<WebhookLog | null> {
  try {
    return JSON.parse((await getConfigValue('WOMPI_LAST_WEBHOOK')) || 'null');
  } catch {
    return null;
  }
}

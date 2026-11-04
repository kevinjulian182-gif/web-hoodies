import { prismaInternal } from '@/lib/prisma';
import { orderShippingCents } from '@/lib/pricing';
import { isManualOrder, isWhatsAppOrder } from '@/lib/orderSource';
import { CASH_ONLY_CATEGORIES, PURCHASE_CATEGORY, TZ_OFFSET } from '@/lib/accountingConfig';

// The store's accounts for a period, computed from what's already recorded:
// orders (sales), merchandise purchases, and the other money in/out
// entered by hand. Nothing is stored twice, so the numbers always match the
// orders and the inventory.
//
// When an order counts as a sale: online payments (Wompi, transfer) the
// moment they're paid; cash on delivery when it's delivered (that's when the
// carrier collects the money). Until then a COD order is "por cobrar".

export type Period = { from: string; to: string };

const dayStart = (ymd: string) => new Date(`${ymd}T00:00:00${TZ_OFFSET}`);
/** "YYYY-MM-DD" of a date in Colombian time. */
const localDay = (d: Date) => new Date(d.getTime() - 5 * 3600_000).toISOString().slice(0, 10);

type OrderRow = Awaited<ReturnType<typeof loadOrders>>[number];

function loadOrders() {
  return prismaInternal.order.findMany({
    where: { status: { not: 'CANCELLED' } },
    include: {
      items: { include: { product: { select: { id: true, name: true, costCents: true, images: true, colorImages: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

const isCollected = (o: OrderRow) =>
  o.paymentMethod === 'COD'
    ? o.status === 'DELIVERED'
    : o.status === 'PAID' || o.status === 'SHIPPED' || o.status === 'DELIVERED';

const saleDate = (o: OrderRow) => (o.paymentMethod === 'COD' ? o.deliveredAt ?? o.updatedAt : o.createdAt);

const channelOf = (ref: string) => (isManualOrder(ref) ? 'Manual' : isWhatsAppOrder(ref) ? 'WhatsApp' : 'Web');
const PAYMENT_LABEL = { WOMPI: 'Wompi', COD: 'Contra entrega', TRANSFER: 'Transferencia' } as const;

function costOf(o: OrderRow) {
  let cost = 0;
  let missing = 0;
  for (const i of o.items) {
    if (i.product.costCents == null || i.product.costCents <= 0) missing += i.quantity;
    else cost += i.product.costCents * i.quantity;
  }
  return { cost, missing };
}

export async function computeAccounts({ from, to }: Period) {
  const start = dayStart(from);
  const end = new Date(dayStart(to).getTime() + 86400_000);
  const inPeriod = (d: Date) => d >= start && d < end;

  const [orders, purchases, entries, products] = await Promise.all([
    loadOrders(),
    prismaInternal.purchase.findMany({ where: { date: { gte: start, lt: end } }, include: { items: true }, orderBy: { date: 'desc' } }),
    prismaInternal.ledgerEntry.findMany({ where: { date: { gte: start, lt: end } }, orderBy: { date: 'desc' } }),
    prismaInternal.product.findMany({
      select: { id: true, name: true, stock: true, priceCents: true, costCents: true, active: true, variants: { select: { stock: true } } },
    }),
  ]);

  // ── Sales ──
  const sales = orders
    .filter((o) => isCollected(o) && inPeriod(saleDate(o)))
    .map((o) => {
      const { cost, missing } = costOf(o);
      return {
        id: o.id,
        date: saleDate(o).toISOString(),
        reference: o.wompiReference,
        customer: o.customerName,
        city: o.shippingCity,
        channel: channelOf(o.wompiReference),
        payment: PAYMENT_LABEL[o.paymentMethod],
        items: o.items.map((i) => ({ name: i.product.name, size: i.size, color: i.color, quantity: i.quantity })),
        units: o.items.reduce((n, i) => n + i.quantity, 0),
        totalCents: o.totalCents,
        shippingCents: orderShippingCents(o),
        discountCents: o.discountCents,
        costCents: cost,
        missingCostUnits: missing,
      };
    });

  const receivables = orders
    .filter((o) => o.paymentMethod === 'COD' && (o.status === 'PENDING' || o.status === 'SHIPPED'))
    .map((o) => ({
      id: o.id,
      date: o.createdAt.toISOString(),
      reference: o.wompiReference,
      customer: o.customerName,
      status: o.status,
      trackingNumber: o.trackingNumber,
      totalCents: o.totalCents,
    }));

  // ── Totals ──
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const revenue = sum(sales.map((s) => s.totalCents));
  const cogs = sum(sales.map((s) => s.costCents));
  const purchasesTotal = sum(purchases.map((p) => p.totalCents));
  const expenses = entries.filter((e) => e.type === 'EXPENSE');
  const incomes = entries.filter((e) => e.type === 'INCOME');
  const operatingExpenses = sum(expenses.filter((e) => !CASH_ONLY_CATEGORIES.has(e.category)).map((e) => e.amountCents));
  const otherIncome = sum(incomes.filter((e) => !CASH_ONLY_CATEGORIES.has(e.category)).map((e) => e.amountCents));
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - operatingExpenses + otherIncome;
  const cashIn = revenue + sum(incomes.map((e) => e.amountCents));
  const cashOut = purchasesTotal + sum(expenses.map((e) => e.amountCents));
  const units = sum(sales.map((s) => s.units));

  const inventory = products.reduce(
    (acc, p) => {
      const stock = p.variants.length ? sum(p.variants.map((v) => v.stock)) : p.stock;
      if (stock <= 0) return acc;
      acc.units += stock;
      acc.atPrice += stock * p.priceCents;
      if (p.costCents && p.costCents > 0) acc.atCost += stock * p.costCents;
      else acc.missingCost.push(p.name);
      return acc;
    },
    { units: 0, atCost: 0, atPrice: 0, missingCost: [] as string[] }
  );

  // ── Over time: daily up to two months, monthly beyond ──
  const days = Math.round((end.getTime() - start.getTime()) / 86400_000);
  const monthly = days > 62;
  const bucketOf = (d: Date) => (monthly ? localDay(d).slice(0, 7) : localDay(d));
  const buckets = new Map<string, { key: string; salesCents: number; spentCents: number }>();
  for (let t = start.getTime(); t < end.getTime(); t += 86400_000) {
    const key = bucketOf(new Date(t));
    if (!buckets.has(key)) buckets.set(key, { key, salesCents: 0, spentCents: 0 });
  }
  for (const s of sales) buckets.get(bucketOf(new Date(s.date)))!.salesCents += s.totalCents;
  for (const p of purchases) {
    const b = buckets.get(bucketOf(p.date));
    if (b) b.spentCents += p.totalCents;
  }
  for (const e of expenses) {
    const b = buckets.get(bucketOf(e.date));
    if (b) b.spentCents += e.amountCents;
  }

  // ── Breakdowns ──
  const tally = (pairs: [string, number][]) => {
    const m = new Map<string, number>();
    for (const [k, v] of pairs) m.set(k, (m.get(k) ?? 0) + v);
    return [...m.entries()].map(([label, cents]) => ({ label, cents })).sort((a, b) => b.cents - a.cents);
  };
  const spendingByCategory = tally([
    ...(purchasesTotal ? ([[PURCHASE_CATEGORY, purchasesTotal]] as [string, number][]) : []),
    ...expenses.map((e) => [e.category, e.amountCents] as [string, number]),
  ]);
  const salesByChannel = tally(sales.map((s) => [s.channel, s.totalCents]));
  const salesByPayment = tally(sales.map((s) => [s.payment, s.totalCents]));

  const productMap = new Map<string, { name: string; units: number; revenueCents: number; costCents: number; missingCost: boolean }>();
  for (const o of orders.filter((o) => isCollected(o) && inPeriod(saleDate(o)))) {
    // Each line's share of what the order charged (discounts spread evenly).
    const factor = o.subtotalCents > 0 ? (o.subtotalCents - o.discountCents) / o.subtotalCents : 1;
    for (const i of o.items) {
      const row = productMap.get(i.productId) ?? { name: i.product.name, units: 0, revenueCents: 0, costCents: 0, missingCost: false };
      row.units += i.quantity;
      row.revenueCents += Math.round(i.priceCents * i.quantity * factor);
      if (i.product.costCents && i.product.costCents > 0) row.costCents += i.product.costCents * i.quantity;
      else row.missingCost = true;
      productMap.set(i.productId, row);
    }
  }
  const topProducts = [...productMap.entries()]
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => b.revenueCents - a.revenueCents);

  // ── One ledger with every movement of money in the period ──
  const movements = [
    ...sales.map((s) => ({
      id: `order-${s.id}`,
      date: s.date,
      type: 'INCOME' as const,
      source: 'Venta',
      category: `Venta ${s.channel.toLowerCase()}`,
      description: `${s.customer} · ${s.reference}`,
      method: s.payment,
      amountCents: s.totalCents,
    })),
    ...purchases.map((p) => ({
      id: `purchase-${p.id}`,
      date: p.date.toISOString(),
      type: 'EXPENSE' as const,
      source: 'Compra',
      category: PURCHASE_CATEGORY,
      description: `${p.supplier}${p.invoiceNumber ? ` · factura ${p.invoiceNumber}` : ''}`,
      method: p.paymentMethod,
      amountCents: p.totalCents,
    })),
    ...entries.map((e) => ({
      id: `entry-${e.id}`,
      date: e.date.toISOString(),
      type: e.type as 'INCOME' | 'EXPENSE',
      source: e.type === 'INCOME' ? 'Ingreso' : 'Gasto',
      category: e.category,
      description: e.description + (e.reference ? ` · ${e.reference}` : ''),
      method: e.method,
      amountCents: e.amountCents,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return {
    period: { from, to, monthly },
    summary: {
      revenueCents: revenue,
      cogsCents: cogs,
      grossProfitCents: grossProfit,
      grossMargin: revenue > 0 ? grossProfit / revenue : null,
      operatingExpensesCents: operatingExpenses,
      otherIncomeCents: otherIncome,
      netProfitCents: netProfit,
      netMargin: revenue > 0 ? netProfit / revenue : null,
      purchasesCents: purchasesTotal,
      cashInCents: cashIn,
      cashOutCents: cashOut,
      cashFlowCents: cashIn - cashOut,
      orders: sales.length,
      units,
      averageTicketCents: sales.length ? Math.round(revenue / sales.length) : 0,
      shippingChargedCents: sum(sales.map((s) => s.shippingCents)),
      discountsCents: sum(sales.map((s) => s.discountCents)),
      missingCostUnits: sum(sales.map((s) => s.missingCostUnits)),
      receivableCents: sum(receivables.map((r) => r.totalCents)),
    },
    inventory,
    series: [...buckets.values()],
    spendingByCategory,
    salesByChannel,
    salesByPayment,
    topProducts,
    sales,
    receivables,
    purchases: purchases.map((p) => ({ ...p, date: p.date.toISOString(), createdAt: p.createdAt.toISOString() })),
    entries: entries.map((e) => ({ ...e, date: e.date.toISOString(), createdAt: e.createdAt.toISOString() })),
    movements,
  };
}

export type Accounts = Awaited<ReturnType<typeof computeAccounts>>;

// Product order chosen in Admin › Productos › Ordenar, stored as a JSON
// array of product ids in SiteContent ('catalog.product_order').

export function parseProductOrder(raw: string | undefined | null): string[] {
  try {
    const value = JSON.parse(raw || '[]');
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Sorts products by the admin's order. Products not placed yet (added after
 * the last time the order was saved) go first, newest first, so new
 * arrivals show up at the top until they're placed. */
export function sortByAdminOrder<T extends { id: string; createdAt: Date | string }>(
  products: T[],
  rawOrder: string | undefined | null
): T[] {
  const order = parseProductOrder(rawOrder);
  const rank = new Map(order.map((id, i) => [id, i]));
  const time = (p: T) => new Date(p.createdAt).getTime();
  return [...products].sort((a, b) => {
    const ra = rank.get(a.id);
    const rb = rank.get(b.id);
    if (ra === undefined && rb === undefined) return time(b) - time(a);
    if (ra === undefined) return -1;
    if (rb === undefined) return 1;
    return ra - rb;
  });
}

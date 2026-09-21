export function isOnSale(priceCents: number, compareAtPriceCents: number | null): compareAtPriceCents is number {
  return typeof compareAtPriceCents === 'number' && compareAtPriceCents > priceCents;
}

export function discountPercent(priceCents: number, compareAtPriceCents: number): number {
  return Math.round((1 - priceCents / compareAtPriceCents) * 100);
}

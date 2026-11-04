/** Splits a product with multiple colors into one card per color, so the
 * catalog shows "Nike Hoodie — Negro" and "Nike Hoodie — Blanco" as separate
 * entries instead of one card with a swatch picker. A product with 0-1
 * colors is left untouched (displayColor: null) since there's nothing to
 * split. Internally it's still the same Product row — the split only
 * changes what the grid renders, not storage, stock, or the PDP. */
export function expandByColor<T extends { id: string; colors: string[] }>(
  products: T[]
): (T & { displayColor: string | null; cardKey: string })[] {
  const result: (T & { displayColor: string | null; cardKey: string })[] = [];
  for (const product of products) {
    if (product.colors.length > 1) {
      for (const color of product.colors) {
        result.push({ ...product, displayColor: color, cardKey: `${product.id}:${color}` });
      }
    } else {
      result.push({ ...product, displayColor: null, cardKey: product.id });
    }
  }
  return result;
}

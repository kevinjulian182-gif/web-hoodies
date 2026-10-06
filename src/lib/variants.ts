export type VariantStock = { size: string; color: string | null; stock: number };

/** Stable key for a size+color combination, used as a map key in forms and
 * for matching a cart/order line item to its ProductVariant row. `color`
 * is null for products with no color options. */
export function variantKey(size: string, color: string | null | undefined): string {
  return `${size}::${color ?? ''}`;
}

/** Every size×color combination a product's current sizes/colors imply —
 * one variant per size when there are no colors, one per (size, color)
 * pair otherwise. */
export function variantCombos(sizes: string[], colors: string[]): { size: string; color: string | null }[] {
  const colorList = colors.length > 0 ? colors : [null];
  return sizes.flatMap((size) => colorList.map((color) => ({ size, color })));
}

/** Starting point when a product has no ProductVariant rows yet (created
 * before per-variant stock existed): spread its one existing total evenly
 * across every size×color combo, remainder to the first few, so the sum
 * matches what was there and the admin edits real numbers from a sane
 * default instead of a wall of zeros. */
export function evenSplitStock(total: number, sizes: string[], colors: string[]): Record<string, number> {
  const combos = variantCombos(sizes, colors);
  if (combos.length === 0) return {};
  const base = Math.floor(total / combos.length);
  const remainder = total % combos.length;
  const result: Record<string, number> = {};
  combos.forEach((combo, i) => {
    result[variantKey(combo.size, combo.color)] = base + (i < remainder ? 1 : 0);
  });
  return result;
}

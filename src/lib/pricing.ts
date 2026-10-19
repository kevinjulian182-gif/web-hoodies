// Order math shared by the checkout UI and the APIs that create orders, so
// the total a shopper sees is exactly the one they're charged. Client-safe:
// no Prisma imports.

export type CouponTerms = { discountType: 'PERCENT' | 'FIXED'; value: number };

export function computeDiscountCents(coupon: CouponTerms | null | undefined, subtotalCents: number): number {
  if (!coupon) return 0;
  return coupon.discountType === 'PERCENT'
    ? Math.round((subtotalCents * coupon.value) / 100)
    : Math.min(coupon.value, subtotalCents);
}

/** Flat shipping fee, waived once the cart subtotal (before coupons, the
 * same number the cart's free-shipping bar tracks) reaches the threshold.
 * A threshold of 0 means free shipping is off, so the fee always applies. */
export function computeShippingCents(subtotalCents: number, thresholdCents: number, costCents: number): number {
  if (costCents <= 0) return 0;
  if (thresholdCents > 0 && subtotalCents >= thresholdCents) return 0;
  return costCents;
}

/** Orders have no shipping column: whatever the total holds beyond the
 * discounted subtotal is the shipping that was charged. */
export function orderShippingCents(order: { subtotalCents: number; discountCents: number; totalCents: number }): number {
  return Math.max(0, order.totalCents - (order.subtotalCents - order.discountCents));
}

// Order math shared by the checkout UI and the APIs that create orders, so
// the total a shopper sees is exactly the one they're charged. Client-safe:
// no Prisma imports.

import { formatCOP } from '@/lib/format';

export type CouponTerms = { discountType: 'PERCENT' | 'FIXED'; value: number };

export function computeDiscountCents(coupon: CouponTerms | null | undefined, subtotalCents: number): number {
  if (!coupon) return 0;
  return coupon.discountType === 'PERCENT'
    ? Math.round((subtotalCents * coupon.value) / 100)
    : Math.min(coupon.value, subtotalCents);
}

export function qualifiesForFreeShipping(subtotalCents: number, thresholdCents: number): boolean {
  return thresholdCents > 0 && subtotalCents >= thresholdCents;
}

// Interrapidísimo's price changes with the package and the destination, so
// the store never charges a fixed shipping rate: the order total holds the
// products only and the shopper pays the freight to the carrier on delivery
// ("+ envío"). Orders that reach the free-shipping threshold ship free (the
// store pays the freight).
export const SHIPPING_EXTRA = '+ envío';
export const SHIPPING_EXTRA_NOTE = 'El envío lo pagas al recibir, según la tarifa de Interrapidísimo para tu ciudad.';

/** Orders have no shipping column: whatever the total holds beyond the
 * discounted subtotal is the shipping that was charged (orders made while
 * the store still charged a fixed rate). */
export function orderShippingCents(order: { subtotalCents: number; discountCents: number; totalCents: number }): number {
  return Math.max(0, order.totalCents - (order.subtotalCents - order.discountCents));
}

/** How an order's shipping reads on emails, alerts and labels. */
export function orderShippingText(
  order: { subtotalCents: number; discountCents: number; totalCents: number },
  thresholdCents: number
): string {
  const charged = orderShippingCents(order);
  if (charged > 0) return formatCOP(charged);
  return qualifiesForFreeShipping(order.subtotalCents, thresholdCents) ? 'Gratis' : 'Lo pagas al recibir (Interrapidísimo)';
}

/** The carrier collects the freight from the recipient (no fixed rate charged, not free). */
export function orderFreightOnDelivery(
  order: { subtotalCents: number; discountCents: number; totalCents: number },
  thresholdCents: number
): boolean {
  return orderShippingCents(order) === 0 && !qualifiesForFreeShipping(order.subtotalCents, thresholdCents);
}

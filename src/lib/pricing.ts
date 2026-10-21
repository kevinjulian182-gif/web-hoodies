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

/** Carrier (Interrapidísimo) price by destination zone, set in Admin ›
 * Contenido › Envíos. Departments not listed in a zone pay the national rate. */
export type ShippingRates = {
  localCents: number;
  regionalCents: number;
  nationalCents: number;
  specialCents: number;
  localDepartments: string[];
  regionalDepartments: string[];
  specialDepartments: string[];
};

export type ShippingZone = 'local' | 'regional' | 'national' | 'special';

export const ZONE_LABELS: Record<ShippingZone, string> = {
  local: 'Envío local',
  regional: 'Envío regional',
  national: 'Envío nacional',
  special: 'Envío a zona especial',
};

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bd\.?\s?c\.?$/, '')
    .replace(/[^a-z ]/g, '')
    .trim();

export function shippingZone(department: string, rates: ShippingRates): ShippingZone {
  const d = norm(department);
  const inList = (list: string[]) => list.some((x) => norm(x) === d);
  if (inList(rates.localDepartments)) return 'local';
  if (inList(rates.regionalDepartments)) return 'regional';
  if (inList(rates.specialDepartments)) return 'special';
  return 'national';
}

const ZONE_RATE: Record<ShippingZone, keyof ShippingRates> = {
  local: 'localCents',
  regional: 'regionalCents',
  national: 'nationalCents',
  special: 'specialCents',
};

/** Cheapest rate in the table, for "desde $X" before the destination is known. */
export function minShippingCents(rates: ShippingRates): number {
  const all = [rates.localCents, rates.regionalCents, rates.nationalCents, rates.specialCents].filter((c) => c > 0);
  return all.length ? Math.min(...all) : 0;
}

export function qualifiesForFreeShipping(subtotalCents: number, thresholdCents: number): boolean {
  return thresholdCents > 0 && subtotalCents >= thresholdCents;
}

/** Shipping for a cart going to `department`, waived once the subtotal
 * (before coupons, the same number the cart's free-shipping bar tracks)
 * reaches the threshold. A threshold of 0 means free shipping is off. */
export function computeShippingCents(
  subtotalCents: number,
  thresholdCents: number,
  rates: ShippingRates,
  department: string
): number {
  if (qualifiesForFreeShipping(subtotalCents, thresholdCents)) return 0;
  return Math.max(0, rates[ZONE_RATE[shippingZone(department, rates)]] as number);
}

/** Orders have no shipping column: whatever the total holds beyond the
 * discounted subtotal is the shipping that was charged. */
export function orderShippingCents(order: { subtotalCents: number; discountCents: number; totalCents: number }): number {
  return Math.max(0, order.totalCents - (order.subtotalCents - order.discountCents));
}

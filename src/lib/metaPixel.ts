// Meta Pixel helpers. The base code is loaded by components/MetaPixel.tsx;
// these just send standard events when it's there (ad blockers, admin
// pages and the first moments before it loads are silently skipped).

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1671909967665125';

type Fbq = (command: 'track', event: string, params?: Record<string, unknown>, options?: { eventID?: string }) => void;

export function trackPixel(event: string, params?: Record<string, unknown>, eventID?: string) {
  if (typeof window === 'undefined') return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (!fbq) return;
  try {
    fbq('track', event, params, eventID ? { eventID } : undefined);
  } catch {
    // never let analytics break the store
  }
}

/** Same id the WhatsApp/Meta catalog feed gives each product+color, so
 * pixel events match catalog items (needed for catalog ads). */
export function catalogItemId(productId: string, color?: string | null): string {
  if (!color) return productId;
  return `${productId}-${color.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export const pesos = (cents: number) => Math.round(cents / 100);

/** Purchase details saved when an order is created and sent on the
 * success page (Wompi returns there after paying). */
export const PENDING_PURCHASE_KEY = 'afra-pending-purchase';

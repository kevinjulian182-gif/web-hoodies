'use client';

import { hasOptionalCookieConsent } from '@/lib/legal';

// Client side of the first-party product analytics. Events are only sent
// when the visitor accepted analytics cookies; the session id is random,
// lives in sessionStorage (gone when the browser closes) and carries no
// personal data.

export type AnalyticsEventName =
  | 'page_view'
  | 'view_product'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'checkout_step'
  | 'checkout_error'
  | 'purchase'
  | 'whatsapp_order';

const SESSION_KEY = 'afra-sid';

function sessionId(): string | null {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function track(
  name: AnalyticsEventName,
  data: { productId?: string; step?: number; detail?: string; value?: number } = {}
) {
  if (typeof window === 'undefined' || !hasOptionalCookieConsent()) return;
  const id = sessionId();
  if (!id) return;
  const body = JSON.stringify({ sessionId: id, name, path: window.location.pathname, ...data });
  try {
    if (navigator.sendBeacon?.('/api/analytics', new Blob([body], { type: 'application/json' }))) return;
  } catch {
    // fall through to fetch
  }
  fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(
    () => {}
  );
}

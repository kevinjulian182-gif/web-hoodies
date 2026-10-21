'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/analytics';
import { COOKIE_CONSENT_EVENT } from '@/lib/legal';

/** Counts every page of the visit (client navigations included), and the
 * current one as soon as the visitor accepts analytics cookies. */
export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    track('page_view');
  }, [pathname]);

  useEffect(() => {
    const onConsent = (e: Event) => {
      if ((e as CustomEvent).detail === 'all') track('page_view');
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
  }, []);

  return null;
}

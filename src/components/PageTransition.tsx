'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

// No AnimatePresence here on purpose: with mode="wait" this component held
// the OLD page in an exit animation and only mounted the new page once that
// exit's rAF loop reported complete. If that callback never fired (tab
// backgrounded mid-navigation, an RSC boundary swapping children out from
// under the exiting node), the new page's content sat in the DOM but never
// reached opacity 1 — present but invisible until a full reload. A plain
// keyed mount+animate has no such coordination step.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // `usePathname()` updates the moment navigation starts, i.e. exactly when
  // this component remounts with the route's loading.tsx fallback — which
  // is much shorter than real page content. Without this, the browser
  // clamps the still-deep scroll position to the fallback's smaller height
  // (landing on the Footer, since that's always mounted below `children`),
  // then jumps again once the real content streams in. Resetting here, in
  // a layout effect so it runs before paint, fixes that — but behavior
  // must be 'instant', not the default 'auto', which defers to the global
  // smooth scroll-behavior CSS and visibly animates the reset instead of
  // skipping it.
  useLayoutEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch {
      // Older Safari/Android WebViews reject the 'instant' enum value.
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return (
    // CSS animation, not Framer: see .animate-page-in in globals.css — the
    // page must be visible from the server HTML, not after hydration.
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}

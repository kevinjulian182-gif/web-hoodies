'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPixel } from '@/lib/metaPixel';

// The pixel's base code lives in the root layout's <head>. The App Router
// changes pages without a reload, so this sends the PageView for every
// page after the first (the base code already counted that one).
export default function MetaPixel() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    trackPixel('PageView');
  }, [pathname]);

  return null;
}

'use client';

import { useEffect, useState } from 'react';
import { formatCOP } from '@/lib/format';

export default function MobileBuyBar({ name, priceCents }: { name: string; priceCents: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const buyBox = document.getElementById('comprar');
    if (!buyBox) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      rootMargin: '-96px 0px 0px 0px',
    });
    observer.observe(buyBox);
    return () => observer.disconnect();
  }, []);

  return (
    // Sits directly on top of the mobile tab bar (3.5rem + safe area); when
    // hidden it slides down behind it, so it also fades out to not peek
    // through the tab bar's translucent background.
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-40 flex items-center justify-between gap-4 border-t border-cream-200 bg-cream-50 px-6 py-3 transition-[transform,opacity] duration-300 md:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-coffee-900">{name}</p>
        <p className="text-sm text-coffee-600">{formatCOP(priceCents)}</p>
      </div>
      <a
        href="#comprar"
        className="shrink-0 rounded-full bg-coffee-900 px-6 py-3 text-sm font-medium text-cream-50 transition-colors transition-transform hover:bg-coffee-800 active:scale-[0.97]"
      >
        Comprar
      </a>
    </div>
  );
}

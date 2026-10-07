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
    <div
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      className={`fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-cream-200 bg-cream-50/95 backdrop-blur-sm px-6 pt-4 transition-transform duration-300 md:hidden ${
        visible ? 'translate-y-0' : 'translate-y-full'
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

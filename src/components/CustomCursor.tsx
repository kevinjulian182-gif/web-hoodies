'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function CustomCursor() {
  const pathname = usePathname();
  const posRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  const disabled = pathname.startsWith('/admin');

  useEffect(() => {
    if (disabled) return;
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFinePointer || prefersReducedMotion) return;

    setEnabled(true);
    document.documentElement.classList.add('custom-cursor');

    const onMove = (e: MouseEvent) => {
      posRef.current?.style.setProperty(
        'transform',
        `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`
      );
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactive = target.closest('a, button, input, textarea, select, [role="button"]');
      dotRef.current?.classList.toggle('scale-[2.5]', Boolean(interactive));
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseover', onOver);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      document.documentElement.classList.remove('custom-cursor');
    };
  }, [disabled]);

  if (!enabled || disabled) return null;

  return (
    <div ref={posRef} className="pointer-events-none fixed left-0 top-0 z-[100]">
      <div
        ref={dotRef}
        className="h-2 w-2 rounded-full bg-coffee-900 shadow-[0_0_0_1.5px_rgba(253,252,250,0.95)] transition-transform duration-150 ease-out"
      />
    </div>
  );
}

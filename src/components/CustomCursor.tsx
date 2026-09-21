'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function CustomCursor() {
  const pathname = usePathname();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  const disabled = pathname.startsWith('/admin');

  useEffect(() => {
    if (disabled) return;
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFinePointer || prefersReducedMotion) return;

    setEnabled(true);
    document.documentElement.classList.add('custom-cursor');

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX;
    let ringY = targetY;
    let rotate = 45;
    let scale = 1;
    let isInteractive = false;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      dotRef.current?.style.setProperty(
        'transform',
        `translate(${targetX}px, ${targetY}px) translate(-50%, -50%) rotate(45deg)`
      );
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      isInteractive = Boolean(target.closest('a, button, input, textarea, select, [role="button"]'));
    };

    // Diamond stamp that snaps to a square over anything clickable — the
    // reticle/tag look reads more "street" than a plain circle. Rotation and
    // scale are lerped by hand (not CSS transitions) since the element's
    // transform is already being overwritten every frame for position; a
    // CSS transition on the same property would just fight that.
    const loop = () => {
      ringX += (targetX - ringX) * 0.2;
      ringY += (targetY - ringY) * 0.2;
      const targetRotate = isInteractive ? 0 : 45;
      const targetScale = isInteractive ? 1.3 : 1;
      rotate += (targetRotate - rotate) * 0.25;
      scale += (targetScale - scale) * 0.25;
      ringRef.current?.style.setProperty(
        'transform',
        `translate(${ringX}px, ${ringY}px) translate(-50%, -50%) rotate(${rotate}deg) scale(${scale})`
      );
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseover', onOver);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      document.documentElement.classList.remove('custom-cursor');
    };
  }, [disabled]);

  if (!enabled || disabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[100] h-2 w-2 bg-white mix-blend-difference"
      />
      <div
        ref={ringRef}
        className="pointer-events-none fixed left-0 top-0 z-[100] h-8 w-8 border-2 border-white mix-blend-difference"
      />
    </>
  );
}

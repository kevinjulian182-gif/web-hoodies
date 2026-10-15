'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SizeChart } from '@/lib/sizeChart';

// "Guía de tallas" link + its table: a bottom sheet on phones (thumb reach,
// swipe-friendly), a centered dialog from md up. The size currently picked
// in the buy box is highlighted so the shopper reads their own row first.
export default function SizeGuide({
  chart,
  sizes,
  selectedSize,
  onSelectSize,
}: {
  chart: SizeChart;
  sizes: string[];
  selectedSize: string;
  onSelectSize: (size: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const rows = sizes.filter((s) => chart.rows[s]?.some((v) => v.trim() !== ''));

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsDesktop(window.matchMedia('(min-width: 768px)').matches);
          setOpen(true);
        }}
        className="flex items-center gap-1.5 text-xs text-coffee-700 underline decoration-coffee-300 underline-offset-4 transition-colors hover:text-coffee-900 hover:decoration-coffee-900"
      >
        <RulerIcon />
        Guía de tallas
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[80] bg-coffee-900/40 backdrop-blur-[2px]"
            />
            <div className="pointer-events-none fixed inset-0 z-[81] flex items-end justify-center md:items-center md:p-6">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Guía de tallas"
              initial={isDesktop ? { opacity: 0, scale: 0.96, y: 8 } : { y: '100%' }}
              animate={isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
              exit={isDesktop ? { opacity: 0, scale: 0.97, y: 4 } : { y: '100%' }}
              transition={isDesktop ? { duration: 0.2, ease: [0.16, 1, 0.3, 1] } : { type: 'spring', stiffness: 380, damping: 38 }}
              className="pointer-events-auto max-h-[85dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-cream-50 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl md:max-w-lg md:rounded-3xl md:p-8"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-cream-300 md:hidden" aria-hidden="true" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tightest text-coffee-900">Guía de tallas</h2>
                  <p className="mt-1 text-xs text-coffee-500">Toca una fila para elegir esa talla.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar guía de tallas"
                  className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-coffee-700 transition-colors hover:bg-cream-100"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 overflow-x-auto rounded-2xl border border-cream-200">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="bg-cream-100/70 text-left text-[10px] uppercase tracking-[0.06em] text-coffee-600 md:text-[11px] md:tracking-[0.08em]">
                      <th className="px-3 py-3 font-medium md:px-4">Talla</th>
                      {chart.columns.map((column, i) => (
                        <th key={i} className="whitespace-nowrap px-3 py-3 font-medium md:px-4">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((size) => {
                      const selected = size === selectedSize;
                      return (
                        <tr
                          key={size}
                          onClick={() => {
                            onSelectSize(size);
                            setOpen(false);
                          }}
                          aria-selected={selected}
                          className={`cursor-pointer border-t border-cream-200 transition-colors ${
                            selected ? 'bg-coffee-900 text-cream-50' : 'text-coffee-800 hover:bg-cream-100'
                          }`}
                        >
                          <td className="px-3 py-3 font-semibold md:px-4">{size}</td>
                          {chart.columns.map((_, i) => (
                            <td key={i} className="px-3 py-3 md:px-4">
                              {chart.rows[size]?.[i] || '—'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {chart.note && <p className="mt-4 text-sm leading-relaxed text-coffee-600">{chart.note}</p>}
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function RulerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="2.5" y="8" width="19" height="8" rx="1.5" />
      <path d="M6.5 8v3M10.5 8v4M14.5 8v3M18.5 8v4" strokeLinecap="round" />
    </svg>
  );
}

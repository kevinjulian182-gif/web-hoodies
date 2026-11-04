'use client';

import { useEffect } from 'react';
import { formatCOP } from '@/lib/format';

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' });
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);
export const signed = (cents: number) => (cents < 0 ? `−${formatCOP(-cents)}` : formatCOP(cents));

export function Tile({
  label,
  value,
  hint,
  negative,
  help,
}: {
  label: string;
  value: string;
  hint?: string;
  negative?: boolean;
  /** Plain-language explanation, shown on hover/long-press. */
  help?: string;
}) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-4" title={help}>
      <p className="flex items-center gap-1 text-xs font-medium text-coffee-600">
        {label}
        {help && (
          <span aria-hidden className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-coffee-300 text-[9px] text-coffee-500">
            ?
          </span>
        )}
      </p>
      <p className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${negative ? 'text-red-700' : 'text-coffee-900'}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-coffee-500">{hint}</p>}
      {help && <span className="sr-only">{help}</span>}
    </div>
  );
}

export function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-coffee-900">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export const Empty = ({ text, action }: { text: string; action?: React.ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-cream-300 bg-white/50 p-8 text-center">
    <p className="text-sm text-coffee-600">{text}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-coffee-900 px-4 py-2.5 text-sm font-medium text-cream-50 transition-transform active:scale-[0.98] disabled:opacity-50';
export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-cream-200 bg-white px-4 py-2.5 text-sm font-medium text-coffee-800 transition-colors hover:bg-cream-100 disabled:opacity-50';

/** Right-hand panel for forms (full screen on phones). Esc or the backdrop closes it. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-coffee-900/40" />
      <div className="relative flex h-dvh w-full max-w-xl flex-col bg-cream-50 shadow-[0_0_48px_-12px_rgba(41,28,19,0.45)]">
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-coffee-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-coffee-600 hover:bg-cream-100">
            Cerrar
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">{children}</div>
      </div>
    </div>
  );
}

/** Small round progress-style bar (e.g. how much of a fiado is paid). */
export function Progress({ value, color = '#2a78d6' }: { value: number; color?: string }) {
  return (
    <div className="h-2 rounded-full bg-cream-100" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: color, minWidth: value > 0 ? 4 : 0 }} />
    </div>
  );
}

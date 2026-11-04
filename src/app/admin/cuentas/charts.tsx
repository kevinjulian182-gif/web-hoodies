'use client';

import { useState } from 'react';
import { formatCOP } from '@/lib/format';

// Two series, fixed order (validated: CVD ΔE 24.7, normal ΔE 33.6, ≥3:1 on
// white). Ventas is always blue and money out always orange, in every chart.
export const SERIES = { sales: '#2a78d6', spent: '#eb6834' } as const;

const compact = (cents: number) => {
  const pesos = cents / 100;
  if (Math.abs(pesos) >= 1_000_000) return `$${(pesos / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  if (Math.abs(pesos) >= 1_000) return `$${Math.round(pesos / 1_000).toLocaleString('es-CO')} mil`;
  return `$${Math.round(pesos).toLocaleString('es-CO')}`;
};

function niceMax(value: number) {
  if (value <= 0) return 100_00;
  const exp = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * exp >= value / 4)! * exp;
  return Math.ceil(value / step) * step;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function bucketLabel(key: string, long = false) {
  const [y, m, d] = key.split('-').map(Number);
  if (!d) return long ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1];
  return long ? `${d} ${MONTHS[m - 1]} ${y}` : String(d);
}

type Bucket = { key: string; salesCents: number; spentCents: number };

/** Grouped columns: Ventas vs Gastos y compras per day or month. */
export function SalesVsSpendingChart({ series }: { series: Bucket[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const max = niceMax(Math.max(...series.map((b) => Math.max(b.salesCents, b.spentCents)), 0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  const height = 220;
  const band = 100 / Math.max(series.length, 1);
  // Bars cap at 24px; labels thin out so they never collide.
  const labelEvery = series.length > 16 ? Math.ceil(series.length / 10) : 1;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs text-coffee-700" aria-label="Leyenda">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES.sales }} /> Ventas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES.spent }} /> Gastos y compras
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="text-xs font-medium text-coffee-700 underline underline-offset-4 hover:text-coffee-900"
        >
          {asTable ? 'Ver gráfica' : 'Ver tabla'}
        </button>
      </div>

      {asTable ? (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-cream-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-cream-50 text-left text-xs text-coffee-600">
              <tr>
                <th className="px-3 py-2 font-medium">Periodo</th>
                <th className="px-3 py-2 text-right font-medium">Ventas</th>
                <th className="px-3 py-2 text-right font-medium">Gastos y compras</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {series.map((b) => (
                <tr key={b.key} className="border-t border-cream-200">
                  <td className="px-3 py-1.5 text-coffee-800">{bucketLabel(b.key, true)}</td>
                  <td className="px-3 py-1.5 text-right text-coffee-900">{formatCOP(b.salesCents)}</td>
                  <td className="px-3 py-1.5 text-right text-coffee-900">{formatCOP(b.spentCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative flex gap-2">
          <div className="relative w-14 shrink-0 text-right text-[11px] tabular-nums text-coffee-500" style={{ height }}>
            {ticks.map((t) => (
              <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>
                {compact(t)}
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
              {ticks.map((t) => (
                <div key={t} className="absolute inset-x-0 h-px bg-cream-200" style={{ top: `${(1 - t / max) * 100}%` }} />
              ))}
              <div className="absolute inset-0 flex">
                {series.map((b, i) => (
                  <div
                    key={b.key}
                    className={`relative flex h-full items-end justify-center gap-[2px] ${hover === i ? 'bg-coffee-900/[0.04]' : ''}`}
                    style={{ width: `${band}%` }}
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    tabIndex={0}
                    aria-label={`${bucketLabel(b.key, true)}: ventas ${formatCOP(b.salesCents)}, gastos y compras ${formatCOP(b.spentCents)}`}
                  >
                    {(['salesCents', 'spentCents'] as const).map((k) => (
                      <div
                        key={k}
                        className="w-full max-w-[24px] rounded-t-[4px]"
                        style={{
                          height: `${(b[k] / max) * 100}%`,
                          minHeight: b[k] > 0 ? 2 : 0,
                          background: k === 'salesCents' ? SERIES.sales : SERIES.spent,
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              {hover !== null && series[hover] && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute top-2 z-10 w-52 rounded-lg border border-cream-200 bg-white px-3 py-2 text-xs shadow-[0_8px_24px_-12px_rgba(41,28,19,0.35)]"
                  style={{
                    left: `${Math.min(Math.max((hover + 0.5) * band, 12), 88)}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <p className="mb-1 font-medium text-coffee-900">{bucketLabel(series[hover].key, true)}</p>
                  <p className="flex items-center justify-between gap-3 text-coffee-700">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm" style={{ background: SERIES.sales }} /> Ventas
                    </span>
                    <span className="tabular-nums text-coffee-900">{formatCOP(series[hover].salesCents)}</span>
                  </p>
                  <p className="flex items-center justify-between gap-3 text-coffee-700">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm" style={{ background: SERIES.spent }} /> Gastos y compras
                    </span>
                    <span className="tabular-nums text-coffee-900">{formatCOP(series[hover].spentCents)}</span>
                  </p>
                </div>
              )}
            </div>
            <div className="mt-1.5 flex text-[11px] text-coffee-500">
              {series.map((b, i) => (
                <span key={b.key} className="truncate text-center" style={{ width: `${band}%` }}>
                  {i % labelEvery === 0 ? bucketLabel(b.key) : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** One series as horizontal bars, values labelled (a ranking, e.g. by category). */
export function BarList({
  rows,
  color,
  empty,
}: {
  rows: { label: string; cents: number }[];
  color: string;
  empty: string;
}) {
  const max = Math.max(...rows.map((r) => r.cents), 0);
  const total = rows.reduce((n, r) => n + r.cents, 0);
  if (!rows.length) return <p className="py-6 text-center text-sm text-coffee-500">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${formatCOP(r.cents)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-coffee-800">{r.label}</span>
            <span className="shrink-0 tabular-nums text-coffee-900">
              {formatCOP(r.cents)}
              <span className="ml-1.5 text-xs text-coffee-500">{total ? Math.round((r.cents / total) * 100) : 0}%</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-cream-100">
            <div className="h-full rounded-full" style={{ width: `${max ? (r.cents / max) * 100 : 0}%`, background: color, minWidth: 4 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

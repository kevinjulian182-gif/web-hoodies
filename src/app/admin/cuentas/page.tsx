'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { REIMBURSEMENT_CATEGORY, STORE_PAYER, todayInColombia } from '@/lib/accountingConfig';
import type { Accounts } from '@/lib/accounting';
import PurchasePanel, { type PurchaseInitial } from './PurchasePanel';
import EntryForm, { type EntryInitial } from './EntryForm';
import { CreditsTab, EntriesTab, MovementsTab, PartnersTab, PurchasesTab, SalesTab, SummaryTab, type TabActions, type TabId } from './tabs';
import { Sheet, secondaryButton } from './ui';

type Preset = 'month' | 'lastMonth' | '30d' | 'year' | 'custom';
type EntryPreset = Parameters<TabActions['newEntry']>[0];

const TABS: { value: TabId; label: string }[] = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'ventas', label: 'Ventas' },
  { value: 'compras', label: 'Compras' },
  { value: 'gastos', label: 'Gastos' },
  { value: 'fiados', label: 'Fiados' },
  { value: 'debe', label: 'Socios' },
  { value: 'movimientos', label: 'Movimientos' },
];

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'month', label: 'Este mes' },
  { value: 'lastMonth', label: 'Mes pasado' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'year', label: 'Este año' },
  { value: 'custom', label: 'Elegir fechas' },
];

const addDays = (ymd: string, n: number) => new Date(new Date(`${ymd}T12:00:00Z`).getTime() + n * 86400_000).toISOString().slice(0, 10);

function presetRange(preset: Preset): { from: string; to: string } {
  const today = todayInColombia();
  const [y, m] = today.split('-').map(Number);
  if (preset === 'lastMonth') {
    return {
      from: new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10),
      to: new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10),
    };
  }
  if (preset === '30d') return { from: addDays(today, -29), to: today };
  if (preset === 'year') return { from: `${y}-01-01`, to: today };
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

/** The four things done most often, one tap away. */
const QUICK = [
  { key: 'gasto', label: 'Registrar gasto', hint: 'Envíos, pauta, empaque…', icon: '−' },
  { key: 'compra', label: 'Compra de mercancía', hint: 'Lo que le compras a proveedores', icon: '＋' },
  { key: 'abono', label: 'Abono de un fiado', hint: 'Alguien te pagó lo que debe', icon: '✓' },
  { key: 'reembolso', label: 'Devolver a un socio', hint: 'La tienda le paga lo que puso', icon: '↺' },
] as const;

export default function AccountsPage() {
  const [tab, setTab] = useState<TabId>('resumen');
  const [preset, setPreset] = useState<Preset>('month');
  const [range, setRange] = useState(presetRange('month'));
  const [data, setData] = useState<Accounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchase, setPurchase] = useState<{ initial?: PurchaseInitial } | null>(null);
  const [entry, setEntry] = useState<{ initial?: EntryInitial; preset?: EntryPreset } | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await fetch(`/api/admin/cuentas?from=${range.from}&to=${range.to}`, { cache: 'no-store' });
    const json = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok || !json) return setError(json?.error ?? 'No se pudieron cargar las cuentas.');
    setData(json);
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const people = useMemo(() => {
    if (!data) return [];
    // Saved people first, then any other name already used in the records.
    const names = [
      ...data.partners.map((p) => p.name),
      ...data.spendingByPerson.map((p) => p.label),
      ...data.storeOwes.map((o) => o.person),
      ...data.entries.map((e) => e.paidBy ?? ''),
      ...data.credits.flatMap((c) => c.payments.map((p) => p.receivedBy ?? '')),
    ];
    return [...new Set(names.map((n) => n.trim()).filter((n) => n && n !== STORE_PAYER))];
  }, [data]);

  const actions: TabActions = {
    reload: load,
    goTo: setTab,
    newPurchase: () => setPurchase({}),
    editPurchase: (p) => setPurchase({ initial: p }),
    newEntry: (p) => setEntry({ preset: p }),
    editEntry: (e) => setEntry({ initial: e }),
  };

  const quick = (key: (typeof QUICK)[number]['key']) => {
    if (key === 'gasto') actions.newEntry();
    if (key === 'compra') actions.newPurchase();
    if (key === 'abono') setTab('fiados');
    if (key === 'reembolso') {
      const top = data?.storeOwes.find((o) => o.owedCents > 0);
      if (top) {
        actions.newEntry({
          type: 'EXPENSE',
          category: REIMBURSEMENT_CATEGORY,
          paidBy: top.person,
          amount: Math.round(top.owedCents / 100),
          description: `Devolución a ${top.person}`,
        });
      } else setTab('debe');
    }
  };

  const saved = (text: string) => {
    setToast(text);
    load();
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900">Cuentas</h1>
          <p className="mt-1 text-sm text-coffee-600">Lo que vendes, lo que compras y todo el dinero que entra y sale.</p>
        </div>
        <a href={`/api/admin/cuentas/export?from=${range.from}&to=${range.to}`} className={secondaryButton}>
          Descargar Excel
        </a>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {QUICK.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => quick(q.key)}
            className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-white p-3 text-left transition-[border-color,transform] hover:border-coffee-300 active:scale-[0.99]"
          >
            <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coffee-900 text-base font-semibold text-cream-50">
              {q.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-coffee-900">{q.label}</span>
              <span className="block truncate text-xs text-coffee-500">{q.hint}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Filters: one row above everything they control. */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-cream-200 bg-white p-1" role="radiogroup" aria-label="Periodo">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={preset === p.value}
              onClick={() => {
                setPreset(p.value);
                if (p.value !== 'custom') setRange(presetRange(p.value));
              }}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors ${
                preset === p.value ? 'bg-coffee-900 font-medium text-cream-50' : 'text-coffee-700 hover:bg-cream-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex items-center gap-2 text-sm text-coffee-700">
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))}
              aria-label="Desde"
              className="rounded-lg border border-cream-200 bg-white px-2 py-1.5 text-base sm:text-sm"
            />
            a
            <input
              type="date"
              value={range.to}
              min={range.from}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))}
              aria-label="Hasta"
              className="rounded-lg border border-cream-200 bg-white px-2 py-1.5 text-base sm:text-sm"
            />
          </div>
        )}
        {loading && <span className="text-xs text-coffee-500">Actualizando…</span>}
      </div>

      <div className="sticky top-[6.25rem] z-10 -mx-4 mb-6 overflow-x-auto border-b border-cream-200 bg-cream-50/95 px-4 backdrop-blur md:top-0 md:-mx-8 md:px-8" role="tablist">
        <div className="flex gap-1">
          {TABS.map((t) => {
            const badge =
              t.value === 'fiados' && data?.summary.creditOwedCents
                ? data.credits.filter((c) => c.balanceCents > 0).length
                : t.value === 'debe' && data?.summary.storeOwesCents
                  ? data.storeOwes.filter((o) => o.owedCents > 0).length
                  : 0;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm transition-colors ${
                  tab === t.value ? 'border-coffee-900 font-medium text-coffee-900' : 'border-transparent text-coffee-600 hover:text-coffee-900'
                }`}
              >
                {t.label}
                {badge > 0 && (
                  <span className="rounded-full bg-coffee-900 px-1.5 text-[10px] font-semibold leading-4 text-cream-50">{badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="mb-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
      {!data ? (
        loading && <p className="text-sm text-coffee-600">Cargando…</p>
      ) : (
        <>
          {tab === 'resumen' && <SummaryTab data={data} actions={actions} />}
          {tab === 'ventas' && <SalesTab data={data} />}
          {tab === 'compras' && <PurchasesTab data={data} actions={actions} />}
          {tab === 'gastos' && <EntriesTab data={data} actions={actions} />}
          {tab === 'fiados' && <CreditsTab data={data} actions={actions} people={people} />}
          {tab === 'debe' && <PartnersTab data={data} actions={actions} />}
          {tab === 'movimientos' && <MovementsTab data={data} />}
        </>
      )}

      {purchase && (
        <PurchasePanel
          people={people}
          initial={purchase.initial}
          onClose={() => setPurchase(null)}
          onSaved={() => {
            setPurchase(null);
            setTab('compras');
            saved(purchase.initial ? 'Compra actualizada.' : 'Compra registrada.');
          }}
        />
      )}
      {entry && (
        <Sheet
          title={
            entry.initial
              ? 'Editar movimiento'
              : entry.preset?.category === REIMBURSEMENT_CATEGORY
                ? 'Devolver a un socio'
                : entry.preset?.type === 'INCOME'
                  ? 'Registrar ingreso'
                  : 'Registrar gasto'
          }
          onClose={() => setEntry(null)}
        >
          <EntryForm
            people={people}
            initial={entry.initial}
            preset={entry.preset}
            onCancel={() => setEntry(null)}
            onSaved={() => {
              const wasEdit = Boolean(entry.initial);
              setEntry(null);
              saved(wasEdit ? 'Cambios guardados.' : 'Movimiento registrado.');
            }}
          />
        </Sheet>
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-coffee-900 px-5 py-2.5 text-sm font-medium text-cream-50 shadow-lg">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}

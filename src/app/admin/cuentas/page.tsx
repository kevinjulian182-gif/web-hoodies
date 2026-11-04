'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatCOP } from '@/lib/format';
import { todayInColombia } from '@/lib/accountingConfig';
import type { Accounts } from '@/lib/accounting';
import { BarList, SalesVsSpendingChart, SERIES } from './charts';
import PurchasePanel from './PurchasePanel';
import EntryForm from './EntryForm';

type Tab = 'resumen' | 'ventas' | 'compras' | 'gastos' | 'movimientos';
type Preset = 'month' | 'lastMonth' | '30d' | 'year' | 'custom';

const TABS: { value: Tab; label: string }[] = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'ventas', label: 'Ventas' },
  { value: 'compras', label: 'Compras de mercancía' },
  { value: 'gastos', label: 'Gastos e ingresos' },
  { value: 'movimientos', label: 'Movimientos' },
];

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'month', label: 'Este mes' },
  { value: 'lastMonth', label: 'Mes pasado' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'year', label: 'Este año' },
  { value: 'custom', label: 'Personalizado' },
];

const addDays = (ymd: string, n: number) => new Date(new Date(`${ymd}T12:00:00Z`).getTime() + n * 86400_000).toISOString().slice(0, 10);

function presetRange(preset: Preset): { from: string; to: string } {
  const today = todayInColombia();
  const [y, m] = today.split('-').map(Number);
  if (preset === 'lastMonth') {
    const first = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
    const last = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10);
    return { from: first, to: last };
  }
  if (preset === '30d') return { from: addDays(today, -29), to: today };
  if (preset === 'year') return { from: `${y}-01-01`, to: today };
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);

export default function AccountsPage() {
  const [tab, setTab] = useState<Tab>('resumen');
  const [preset, setPreset] = useState<Preset>('month');
  const [range, setRange] = useState(presetRange('month'));
  const [data, setData] = useState<Accounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchaseOpen, setPurchaseOpen] = useState(false);

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

  const choosePreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') setRange(presetRange(p));
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900">Cuentas</h1>
          <p className="mt-1 text-sm text-coffee-600">Lo que vendes, lo que compras y todo el dinero que entra y sale.</p>
        </div>
        <a
          href={`/api/admin/cuentas/export?from=${range.from}&to=${range.to}`}
          className="rounded-lg border border-cream-200 bg-white px-4 py-2.5 text-sm font-medium text-coffee-800 transition-colors hover:bg-cream-100"
        >
          Descargar Excel
        </a>
      </div>

      {/* Filters: one row above everything they control. */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-cream-200 bg-white p-1" role="radiogroup" aria-label="Periodo">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={preset === p.value}
              onClick={() => choosePreset(p.value)}
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

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-cream-200" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors ${
              tab === t.value ? 'border-coffee-900 font-medium text-coffee-900' : 'border-transparent text-coffee-600 hover:text-coffee-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
      {!data ? (
        loading && <p className="text-sm text-coffee-600">Cargando…</p>
      ) : (
        <>
          {tab === 'resumen' && <Summary data={data} />}
          {tab === 'ventas' && <SalesTab data={data} />}
          {tab === 'compras' && <PurchasesTab data={data} onNew={() => setPurchaseOpen(true)} onChange={load} />}
          {tab === 'gastos' && <EntriesTab data={data} onChange={load} />}
          {tab === 'movimientos' && <MovementsTab data={data} />}
        </>
      )}

      {purchaseOpen && (
        <PurchasePanel
          onClose={() => setPurchaseOpen(false)}
          onSaved={() => {
            setPurchaseOpen(false);
            setTab('compras');
            load();
          }}
        />
      )}
    </div>
  );
}

// ── Resumen ──────────────────────────────────────────────────────────────

function Tile({ label, value, hint, negative }: { label: string; value: string; hint?: string; negative?: boolean }) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-4">
      <p className="text-xs font-medium text-coffee-600">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${negative ? 'text-red-700' : 'text-coffee-900'}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-coffee-500">{hint}</p>}
    </div>
  );
}

const signed = (cents: number) => (cents < 0 ? `−${formatCOP(-cents)}` : formatCOP(cents));

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
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

function Summary({ data }: { data: Accounts }) {
  const s = data.summary;
  return (
    <div>
      {(s.missingCostUnits > 0 || data.inventory.missingCost.length > 0) && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">⚠ Hay productos sin costo registrado.</p>
          <p className="mt-0.5 text-amber-800">
            {s.missingCostUnits > 0 && `${s.missingCostUnits} unidades vendidas en el periodo no tienen costo, así que la utilidad sale más alta de lo real. `}
            Agrega el costo en{' '}
            <Link href="/admin/products" className="underline underline-offset-2">
              Productos
            </Link>{' '}
            o registra la compra de mercancía con «Guardar este costo».
            {data.inventory.missingCost.length > 0 && ` Sin costo: ${data.inventory.missingCost.slice(0, 5).join(', ')}${data.inventory.missingCost.length > 5 ? ` y ${data.inventory.missingCost.length - 5} más` : ''}.`}
          </p>
        </div>
      )}

      <Section title="Resultado del periodo">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Tile label="Ventas" value={formatCOP(s.revenueCents)} hint={`${plural(s.orders, 'pedido', 'pedidos')} · ${plural(s.units, 'unidad', 'unidades')}`} />
          <Tile label="Costo de lo vendido" value={formatCOP(s.cogsCents)} hint="Costo de la mercancía vendida" />
          <Tile label="Utilidad bruta" value={signed(s.grossProfitCents)} hint={`Margen ${pct(s.grossMargin)}`} negative={s.grossProfitCents < 0} />
          <Tile label="Gastos" value={formatCOP(s.operatingExpensesCents)} hint={s.otherIncomeCents ? `Otros ingresos ${formatCOP(s.otherIncomeCents)}` : 'Envíos, pauta, empaque…'} />
          <Tile
            label={s.netProfitCents < 0 ? 'Pérdida neta' : 'Utilidad neta'}
            value={signed(s.netProfitCents)}
            hint={`Margen ${pct(s.netMargin)}`}
            negative={s.netProfitCents < 0}
          />
        </div>
      </Section>

      <Section title="Caja del periodo">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Dinero que entró" value={formatCOP(s.cashInCents)} hint="Ventas cobradas y otros ingresos" />
          <Tile label="Dinero que salió" value={formatCOP(s.cashOutCents)} hint="Compras y gastos" />
          <Tile label="Flujo de caja" value={signed(s.cashFlowCents)} hint={s.cashFlowCents < 0 ? 'Salió más de lo que entró' : 'Entró más de lo que salió'} negative={s.cashFlowCents < 0} />
          <Tile label="Compras de mercancía" value={formatCOP(s.purchasesCents)} hint={plural(data.purchases.length, 'compra', 'compras')} />
        </div>
      </Section>

      <Section title="Hoy">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Por cobrar" value={formatCOP(s.receivableCents)} hint={`${plural(data.receivables.length, 'pedido', 'pedidos')} contra entrega en curso`} />
          <Tile label="Inventario a costo" value={formatCOP(data.inventory.atCost)} hint={`${plural(data.inventory.units, 'unidad', 'unidades')} en stock`} />
          <Tile label="Inventario a precio de venta" value={formatCOP(data.inventory.atPrice)} hint="Si vendes todo el stock" />
          <Tile label="Ticket promedio" value={formatCOP(s.averageTicketCents)} hint={s.discountsCents ? `Descuentos ${formatCOP(s.discountsCents)}` : 'Por pedido vendido'} />
        </div>
      </Section>

      <Section title={data.period.monthly ? 'Ventas vs gastos por mes' : 'Ventas vs gastos por día'}>
        <div className="rounded-2xl border border-cream-200 bg-white p-4">
          <SalesVsSpendingChart series={data.series} />
        </div>
      </Section>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-cream-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-coffee-900">Gastos y compras por categoría</h2>
          <BarList rows={data.spendingByCategory} color={SERIES.spent} empty="Sin gastos ni compras en el periodo." />
        </section>
        <section className="rounded-2xl border border-cream-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-coffee-900">Ventas por canal</h2>
          <BarList rows={data.salesByChannel} color={SERIES.sales} empty="Sin ventas en el periodo." />
          <h2 className="mb-3 mt-6 text-sm font-semibold text-coffee-900">Ventas por forma de pago</h2>
          <BarList rows={data.salesByPayment} color={SERIES.sales} empty="Sin ventas en el periodo." />
        </section>
      </div>

      <Section title="Productos vendidos">
        <TopProducts rows={data.topProducts} />
      </Section>
    </div>
  );
}

function TopProducts({ rows }: { rows: Accounts['topProducts'] }) {
  if (!rows.length) return <Empty text="Sin ventas en el periodo." />;
  return (
    <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-white">
      <table className="w-full min-w-[36rem] text-sm">
        <thead className="text-left text-xs text-coffee-600">
          <tr>
            <th className="px-4 py-2.5 font-medium">Producto</th>
            <th className="px-4 py-2.5 text-right font-medium">Unidades</th>
            <th className="px-4 py-2.5 text-right font-medium">Ventas</th>
            <th className="px-4 py-2.5 text-right font-medium">Costo</th>
            <th className="px-4 py-2.5 text-right font-medium">Utilidad</th>
            <th className="px-4 py-2.5 text-right font-medium">Margen</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((r) => {
            const profit = r.revenueCents - r.costCents;
            return (
              <tr key={r.id} className="border-t border-cream-200">
                <td className="px-4 py-2.5 text-coffee-900">
                  {r.name}
                  {r.missingCost && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800">sin costo</span>}
                </td>
                <td className="px-4 py-2.5 text-right text-coffee-800">{r.units}</td>
                <td className="px-4 py-2.5 text-right text-coffee-900">{formatCOP(r.revenueCents)}</td>
                <td className="px-4 py-2.5 text-right text-coffee-800">{formatCOP(r.costCents)}</td>
                <td className={`px-4 py-2.5 text-right ${profit < 0 ? 'text-red-700' : 'text-coffee-900'}`}>{signed(profit)}</td>
                <td className="px-4 py-2.5 text-right text-coffee-800">{pct(r.revenueCents ? profit / r.revenueCents : null)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const Empty = ({ text }: { text: string }) => (
  <p className="rounded-2xl border border-dashed border-cream-200 p-8 text-center text-sm text-coffee-600">{text}</p>
);

// ── Ventas ───────────────────────────────────────────────────────────────

function SalesTab({ data }: { data: Accounts }) {
  return (
    <div>
      <p className="mb-4 text-xs leading-relaxed text-coffee-500">
        Cuenta como venta un pedido pagado en línea (Wompi o transferencia) o un contra entrega ya entregado: ahí es cuando
        llega el dinero. Los contra entrega en camino aparecen abajo como «por cobrar».
      </p>
      {data.sales.length === 0 ? (
        <Empty text="Sin ventas en el periodo." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-white">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="text-left text-xs text-coffee-600">
              <tr>
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium">Productos</th>
                <th className="px-4 py-2.5 font-medium">Canal · pago</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
                <th className="px-4 py-2.5 text-right font-medium">Costo</th>
                <th className="px-4 py-2.5 text-right font-medium">Utilidad</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.sales.map((s) => (
                <tr key={s.id} className="border-t border-cream-200 align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-coffee-700">{shortDate(s.date)}</td>
                  <td className="px-4 py-2.5">
                    <p className="text-coffee-900">{s.customer}</p>
                    <p className="text-xs text-coffee-500">{s.reference}</p>
                  </td>
                  <td className="px-4 py-2.5 text-coffee-800">
                    {s.items.map((i) => `${i.quantity}× ${i.name} (${[i.size, i.color].filter(Boolean).join(', ')})`).join(' · ')}
                  </td>
                  <td className="px-4 py-2.5 text-coffee-700">
                    {s.channel} · {s.payment}
                  </td>
                  <td className="px-4 py-2.5 text-right text-coffee-900">{formatCOP(s.totalCents)}</td>
                  <td className="px-4 py-2.5 text-right text-coffee-800">
                    {formatCOP(s.costCents)}
                    {s.missingCostUnits > 0 && <span className="block text-[11px] text-amber-700">faltan costos</span>}
                  </td>
                  <td className={`px-4 py-2.5 text-right ${s.totalCents - s.costCents < 0 ? 'text-red-700' : 'text-coffee-900'}`}>
                    {signed(s.totalCents - s.costCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold text-coffee-900">
        Por cobrar · {formatCOP(data.summary.receivableCents)}
      </h2>
      {data.receivables.length === 0 ? (
        <Empty text="No hay pedidos contra entrega pendientes de cobro." />
      ) : (
        <ul className="divide-y divide-cream-200 rounded-2xl border border-cream-200 bg-white">
          {data.receivables.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="text-coffee-900">{r.customer}</p>
                <p className="text-xs text-coffee-500">
                  {r.reference} · {shortDate(r.date)} · {r.status === 'SHIPPED' ? `En camino${r.trackingNumber ? ` (guía ${r.trackingNumber})` : ''}` : 'Por despachar'}
                </p>
              </div>
              <p className="tabular-nums text-coffee-900">{formatCOP(r.totalCents)}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-coffee-500">
        Cuando el mensajero entregue y cobre, márcalo como «Entregado» en el{' '}
        <Link href="/gestor" className="underline underline-offset-2">
          Gestor de pedidos
        </Link>{' '}
        y pasa a ventas.
      </p>
    </div>
  );
}

// ── Compras ──────────────────────────────────────────────────────────────

function PurchasesTab({ data, onNew, onChange }: { data: Accounts; onNew: () => void; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (p: Accounts['purchases'][number]) => {
    const msg = p.addedToStock
      ? `¿Eliminar la compra a ${p.supplier}? Las unidades que sumó al inventario se descuentan de nuevo.`
      : `¿Eliminar la compra a ${p.supplier}?`;
    if (!confirm(msg)) return;
    setBusy(p.id);
    await fetch(`/api/admin/cuentas/compras/${p.id}`, { method: 'DELETE' });
    setBusy(null);
    onChange();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-coffee-600">
          {plural(data.purchases.length, 'compra', 'compras')} · {formatCOP(data.summary.purchasesCents)}
        </p>
        <button
          type="button"
          onClick={onNew}
          className="rounded-lg bg-coffee-900 px-4 py-2.5 text-sm font-medium text-cream-50 transition-transform active:scale-[0.98]"
        >
          + Nueva compra
        </button>
      </div>
      {data.purchases.length === 0 ? (
        <Empty text="Sin compras en el periodo. Registra la mercancía que compras a tus proveedores para llevar el costo y sumar al inventario." />
      ) : (
        <div className="space-y-3">
          {data.purchases.map((p) => (
            <article key={p.id} className="rounded-2xl border border-cream-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-coffee-900">{p.supplier}</p>
                  <p className="text-xs text-coffee-500">
                    {shortDate(p.date)} · {p.paymentMethod}
                    {p.invoiceNumber && ` · factura ${p.invoiceNumber}`}
                    {p.addedToStock && ' · sumada al inventario'}
                  </p>
                </div>
                <p className="text-base font-semibold tabular-nums text-coffee-900">{formatCOP(p.totalCents)}</p>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-coffee-800">
                {p.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3 tabular-nums">
                    <span>
                      {i.quantity}× {i.description}
                      {(i.size || i.color) && <span className="text-coffee-500"> ({[i.size, i.color].filter(Boolean).join(', ')})</span>}
                    </span>
                    <span className="shrink-0 text-coffee-600">
                      {formatCOP(i.unitCostCents)} c/u · {formatCOP(i.unitCostCents * i.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              {p.notes && <p className="mt-2 text-xs italic text-coffee-600">{p.notes}</p>}
              <div className="mt-3 border-t border-cream-200 pt-3">
                <button type="button" onClick={() => remove(p)} disabled={busy === p.id} className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50">
                  {busy === p.id ? 'Eliminando…' : 'Eliminar compra'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Gastos e ingresos ────────────────────────────────────────────────────

function EntriesTab({ data, onChange }: { data: Accounts; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const remove = async (id: string, description: string) => {
    if (!confirm(`¿Eliminar «${description}»?`)) return;
    setBusy(id);
    await fetch(`/api/admin/cuentas/movimientos/${id}`, { method: 'DELETE' });
    setBusy(null);
    onChange();
  };

  return (
    <div>
      <EntryForm onSaved={onChange} />
      <p className="mt-3 text-xs leading-relaxed text-coffee-500">
        Las ventas de la tienda y las compras de mercancía se cuentan solas; aquí van los demás movimientos. El aporte o
        retiro del dueño y los préstamos mueven la caja pero no cuentan como utilidad ni como gasto.
      </p>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-coffee-900">Registrados en el periodo</h2>
      {data.entries.length === 0 ? (
        <Empty text="Sin gastos ni ingresos registrados en el periodo." />
      ) : (
        <ul className="divide-y divide-cream-200 rounded-2xl border border-cream-200 bg-white">
          {data.entries.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="text-coffee-900">{e.description}</p>
                <p className="text-xs text-coffee-500">
                  {shortDate(e.date)} · {e.category} · {e.method}
                  {e.reference && ` · ${e.reference}`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className={`tabular-nums ${e.type === 'INCOME' ? 'text-green-700' : 'text-coffee-900'}`}>
                  {e.type === 'INCOME' ? '+' : '−'}
                  {formatCOP(e.amountCents)}
                </p>
                <button type="button" onClick={() => remove(e.id, e.description)} disabled={busy === e.id} className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50">
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Movimientos ──────────────────────────────────────────────────────────

function MovementsTab({ data }: { data: Accounts }) {
  const [kind, setKind] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [query, setQuery] = useState('');

  // Running balance over the period, oldest first, then shown newest first.
  const rows = useMemo(() => {
    let balance = 0;
    const withBalance = [...data.movements].reverse().map((m) => {
      balance += m.type === 'INCOME' ? m.amountCents : -m.amountCents;
      return { ...m, balance };
    });
    const q = query.trim().toLowerCase();
    return withBalance
      .reverse()
      .filter((m) => (kind === 'ALL' || m.type === kind) && (!q || `${m.description} ${m.category} ${m.method}`.toLowerCase().includes(q)));
  }, [data.movements, kind, query]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-cream-200 bg-white p-1 text-sm" role="radiogroup" aria-label="Tipo de movimiento">
          {(
            [
              ['ALL', 'Todos'],
              ['INCOME', 'Entradas'],
              ['EXPENSE', 'Salidas'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              onClick={() => setKind(value)}
              className={`rounded-md px-3 py-1.5 transition-colors ${kind === value ? 'bg-coffee-900 font-medium text-cream-50' : 'text-coffee-700 hover:bg-cream-100'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente, proveedor, categoría…"
          aria-label="Buscar movimientos"
          className="min-w-[14rem] flex-1 rounded-lg border border-cream-200 bg-white px-3 py-2 text-base text-coffee-900 outline-none focus:border-coffee-600 sm:text-sm"
        />
      </div>

      {rows.length === 0 ? (
        <Empty text="Sin movimientos en el periodo." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-white">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="text-left text-xs text-coffee-600">
              <tr>
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-4 py-2.5 font-medium">Movimiento</th>
                <th className="px-4 py-2.5 font-medium">Medio</th>
                <th className="px-4 py-2.5 text-right font-medium">Entrada</th>
                <th className="px-4 py-2.5 text-right font-medium">Salida</th>
                <th className="px-4 py-2.5 text-right font-medium">Saldo del periodo</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((m) => (
                <tr key={m.id} className="border-t border-cream-200">
                  <td className="whitespace-nowrap px-4 py-2.5 text-coffee-700">{shortDate(m.date)}</td>
                  <td className="px-4 py-2.5">
                    <p className="text-coffee-900">{m.description}</p>
                    <p className="text-xs text-coffee-500">
                      {m.source} · {m.category}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-coffee-700">{m.method}</td>
                  <td className="px-4 py-2.5 text-right text-green-700">{m.type === 'INCOME' ? formatCOP(m.amountCents) : ''}</td>
                  <td className="px-4 py-2.5 text-right text-coffee-900">{m.type === 'EXPENSE' ? formatCOP(m.amountCents) : ''}</td>
                  <td className={`px-4 py-2.5 text-right ${m.balance < 0 ? 'text-red-700' : 'text-coffee-900'}`}>{signed(m.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatCOP } from '@/lib/format';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { PAYMENT_METHODS, REIMBURSEMENT_CATEGORY, STORE_PAYER, todayInColombia } from '@/lib/accountingConfig';
import type { Accounts } from '@/lib/accounting';
import { BarList, SalesVsSpendingChart, SERIES } from './charts';
import { Empty, Progress, Section, Tile, pct, plural, primaryButton, secondaryButton, shortDate, signed } from './ui';
import type { EntryInitial } from './EntryForm';
import type { PurchaseInitial } from './PurchasePanel';

export type TabActions = {
  reload: () => void;
  goTo: (tab: TabId) => void;
  newPurchase: () => void;
  editPurchase: (p: PurchaseInitial) => void;
  newEntry: (preset?: { type: 'EXPENSE' | 'INCOME'; category: string; paidBy?: string; amount?: number; description?: string }) => void;
  editEntry: (e: EntryInitial) => void;
};
export type TabId = 'resumen' | 'ventas' | 'compras' | 'gastos' | 'fiados' | 'debe' | 'movimientos';

const itemsText = (items: { quantity: number; name: string; size: string; color: string | null }[]) =>
  items.map((i) => `${i.quantity}× ${i.name} (${[i.size, i.color].filter(Boolean).join(', ')})`).join(' · ');

// ── Resumen ──────────────────────────────────────────────────────────────

function Pending({ label, value, hint, onClick }: { label: string; value: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-cream-200 bg-white p-4 text-left transition-colors hover:border-coffee-300"
    >
      <p className="text-xs font-medium text-coffee-600">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-coffee-900">{value}</p>
      <p className="mt-0.5 text-xs text-coffee-500">
        {hint} <span className="text-coffee-700 transition-transform group-hover:translate-x-0.5">→</span>
      </p>
    </button>
  );
}

export function SummaryTab({ data, actions }: { data: Accounts; actions: TabActions }) {
  const s = data.summary;
  const lost = s.netProfitCents < 0;
  return (
    <div>
      {/* The answer first, in words. */}
      <div className="mb-6 rounded-2xl bg-coffee-900 p-5 text-cream-50 sm:p-6">
        <p className="text-sm text-cream-200">{lost ? 'En este periodo perdiste' : 'En este periodo ganaste'}</p>
        <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">{formatCOP(Math.abs(s.netProfitCents))}</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-200">
          Vendiste <strong className="font-semibold text-cream-50">{formatCOP(s.revenueCents)}</strong>, esa mercancía costó{' '}
          <strong className="font-semibold text-cream-50">{formatCOP(s.cogsCents)}</strong> y los gastos fueron{' '}
          <strong className="font-semibold text-cream-50">{formatCOP(s.operatingExpensesCents)}</strong>.
          {' '}En la caja de la tienda entraron <strong className="font-semibold text-cream-50">{formatCOP(s.cashInCents)}</strong> y salieron{' '}
          <strong className="font-semibold text-cream-50">{formatCOP(s.cashOutCents)}</strong>.
        </p>
      </div>

      {(s.missingCostUnits > 0 || data.inventory.missingCost.length > 0) && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">⚠ Hay productos sin costo registrado</p>
          <p className="mt-0.5 text-amber-800">
            {s.missingCostUnits > 0 && `${plural(s.missingCostUnits, 'unidad vendida', 'unidades vendidas')} no tienen costo, así que la ganancia sale más alta de lo real. `}
            Pon el costo en{' '}
            <Link href="/admin/products" className="underline underline-offset-2">
              Productos
            </Link>{' '}
            o registra la compra con «Guardar este costo».
          </p>
        </div>
      )}

      <Section title="Pendientes">
        <div className="grid gap-3 sm:grid-cols-3">
          <Pending
            label="Te deben por fiados"
            value={formatCOP(s.creditOwedCents)}
            hint={plural(data.credits.filter((c) => c.balanceCents > 0).length, 'persona', 'personas')}
            onClick={() => actions.goTo('fiados')}
          />
          <Pending
            label="Contra entrega por cobrar"
            value={formatCOP(s.receivableCents)}
            hint={plural(data.receivables.length, 'pedido en curso', 'pedidos en curso')}
            onClick={() => actions.goTo('ventas')}
          />
          <Pending
            label="La tienda les debe"
            value={formatCOP(s.storeOwesCents)}
            hint="Lo que pagaron de su bolsillo"
            onClick={() => actions.goTo('debe')}
          />
        </div>
      </Section>

      <Section title="Resultado del periodo">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Tile label="Ventas" value={formatCOP(s.revenueCents)} hint={`${plural(s.orders, 'pedido', 'pedidos')} · ${plural(s.units, 'unidad', 'unidades')}`} help="Pedidos pagados en línea, contra entrega ya entregados y fiados entregados." />
          <Tile label="Costo de lo vendido" value={formatCOP(s.cogsCents)} help="Lo que costó la mercancía que vendiste: la compra vinculada a esa venta o el costo del producto." />
          <Tile label="Ganancia bruta" value={signed(s.grossProfitCents)} hint={`Margen ${pct(s.grossMargin)}`} negative={s.grossProfitCents < 0} help="Ventas menos el costo de lo vendido." />
          <Tile label="Gastos" value={formatCOP(s.operatingExpensesCents)} hint={s.otherIncomeCents ? `Otros ingresos ${formatCOP(s.otherIncomeCents)}` : 'Envíos, pauta, empaque…'} help="Gastos del negocio. No incluye compras de mercancía, retiros ni reembolsos a socios." />
          <Tile label={lost ? 'Pérdida' : 'Ganancia'} value={signed(s.netProfitCents)} hint={`Margen ${pct(s.netMargin)}`} negative={lost} help="Ganancia bruta menos gastos, más otros ingresos." />
        </div>
      </Section>

      <Section title="Caja de la tienda">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Entró" value={formatCOP(s.cashInCents)} hint="Ventas cobradas, abonos e ingresos" />
          <Tile label="Salió" value={formatCOP(s.cashOutCents)} hint="Compras, gastos y reembolsos" help="Solo lo pagado con dinero de la tienda. Lo que pagó un socio de su bolsillo no sale de la caja." />
          <Tile label="Saldo" value={signed(s.cashFlowCents)} hint={s.cashFlowCents < 0 ? 'Salió más de lo que entró' : 'Entró más de lo que salió'} negative={s.cashFlowCents < 0} />
          <Tile label="Pagado por socios" value={formatCOP(s.paidByPartnersCents)} hint="De su bolsillo, en el periodo" />
        </div>
      </Section>

      <Section title={data.period.monthly ? 'Ventas y gastos por mes' : 'Ventas y gastos por día'}>
        <div className="rounded-2xl border border-cream-200 bg-white p-4">
          <SalesVsSpendingChart series={data.series} />
        </div>
      </Section>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-cream-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-coffee-900">¿En qué se fue la plata?</h2>
          <BarList rows={data.spendingByCategory} color={SERIES.spent} empty="Sin gastos ni compras en el periodo." />
          <h2 className="mb-3 mt-6 text-sm font-semibold text-coffee-900">¿Quién pagó?</h2>
          <BarList rows={data.spendingByPerson} color={SERIES.spent} empty="Sin gastos ni compras en el periodo." />
        </section>
        <section className="rounded-2xl border border-cream-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-coffee-900">Ventas por canal</h2>
          <BarList rows={data.salesByChannel} color={SERIES.sales} empty="Sin ventas en el periodo." />
          <h2 className="mb-3 mt-6 text-sm font-semibold text-coffee-900">Ventas por forma de pago</h2>
          <BarList rows={data.salesByPayment} color={SERIES.sales} empty="Sin ventas en el periodo." />
        </section>
      </div>

      <Section title="Inventario hoy">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Tile label="A costo" value={formatCOP(data.inventory.atCost)} hint={`${plural(data.inventory.units, 'unidad', 'unidades')} en stock`} />
          <Tile label="A precio de venta" value={formatCOP(data.inventory.atPrice)} hint="Si vendes todo el stock" />
          <Tile label="Ticket promedio" value={formatCOP(s.averageTicketCents)} hint="Por pedido vendido" />
        </div>
      </Section>

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
            <th className="px-4 py-2.5 text-right font-medium">Ganancia</th>
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

// ── Ventas ───────────────────────────────────────────────────────────────

export function SalesTab({ data }: { data: Accounts }) {
  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-coffee-600">
        Una venta cuenta cuando se paga en línea, cuando un contra entrega se entrega, o cuando se entrega un fiado.
      </p>
      {data.sales.length === 0 ? (
        <Empty text="Sin ventas en el periodo." />
      ) : (
        <div className="space-y-2">
          {data.sales.map((s) => {
            const profit = s.totalCents - s.costCents;
            return (
              <article key={s.id} className="rounded-2xl border border-cream-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-coffee-900">{s.customer}</p>
                    <p className="text-xs text-coffee-500">
                      {shortDate(s.date)} · {s.channel} · {s.payment} · {s.reference}
                    </p>
                  </div>
                  <p className="text-base font-semibold tabular-nums text-coffee-900">{formatCOP(s.totalCents)}</p>
                </div>
                <p className="mt-2 text-sm text-coffee-800">{itemsText(s.items)}</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-cream-200 pt-3 text-xs tabular-nums text-coffee-600">
                  <span>
                    Costo <strong className="font-medium text-coffee-900">{formatCOP(s.costCents)}</strong>
                    {s.linkedPurchase ? ` (compra a ${s.linkedPurchase})` : s.missingCostUnits > 0 ? ' · faltan costos' : ''}
                  </span>
                  <span>
                    Ganancia{' '}
                    <strong className={`font-medium ${profit < 0 ? 'text-red-700' : 'text-coffee-900'}`}>{signed(profit)}</strong>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold text-coffee-900">Contra entrega por cobrar · {formatCOP(data.summary.receivableCents)}</h2>
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
        Cuando el mensajero entregue y cobre, márcalo «Entregado» en el{' '}
        <Link href="/gestor" className="underline underline-offset-2">
          Gestor de pedidos
        </Link>{' '}
        y pasa a ventas.
      </p>
    </div>
  );
}

// ── Compras ──────────────────────────────────────────────────────────────

export function PurchasesTab({ data, actions }: { data: Accounts; actions: TabActions }) {
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (p: Accounts['purchases'][number]) => {
    const msg = p.addedToStock
      ? `¿Eliminar la compra a ${p.supplier}? Las unidades que sumó al inventario se descuentan de nuevo.`
      : `¿Eliminar la compra a ${p.supplier}?`;
    if (!confirm(msg)) return;
    setBusy(p.id);
    await fetch(`/api/admin/cuentas/compras/${p.id}`, { method: 'DELETE' });
    setBusy(null);
    actions.reload();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-coffee-600">
          {plural(data.purchases.length, 'compra', 'compras')} · {formatCOP(data.summary.purchasesCents)}
        </p>
        <button type="button" onClick={actions.newPurchase} className={primaryButton}>
          + Nueva compra
        </button>
      </div>
      {data.purchases.length === 0 ? (
        <Empty
          text="Sin compras en el periodo. Registra lo que le compras a tus proveedores para saber cuánto te cuesta cada prenda y sumarla al inventario."
          action={
            <button type="button" onClick={actions.newPurchase} className={primaryButton}>
              + Registrar la primera compra
            </button>
          }
        />
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
                  </p>
                </div>
                <p className="text-base font-semibold tabular-nums text-coffee-900">{formatCOP(p.totalCents)}</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${p.paidBy && p.paidBy !== STORE_PAYER ? 'bg-amber-50 text-amber-800' : 'bg-cream-100 text-coffee-700'}`}>
                  Pagó: {p.paidBy || STORE_PAYER}
                </span>
                {p.orderLabel && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800">Para la venta de {p.orderLabel}</span>}
                {p.addedToStock && <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-800">Sumada al inventario</span>}
              </div>
              <ul className="mt-3 space-y-1 text-sm text-coffee-800">
                {p.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3 tabular-nums">
                    <span>
                      {i.quantity}× {i.description}
                      {(i.size || i.color) && <span className="text-coffee-500"> ({[i.size, i.color].filter(Boolean).join(', ')})</span>}
                    </span>
                    <span className="shrink-0 text-coffee-600">{formatCOP(i.unitCostCents * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              {p.notes && <p className="mt-2 text-xs italic text-coffee-600">{p.notes}</p>}
              <div className="mt-3 flex gap-4 border-t border-cream-200 pt-3 text-sm">
                <button type="button" onClick={() => actions.editPurchase(p)} className="font-medium text-coffee-800 hover:text-coffee-900">
                  Editar
                </button>
                <button type="button" onClick={() => remove(p)} disabled={busy === p.id} className="text-red-600 hover:text-red-800 disabled:opacity-50">
                  {busy === p.id ? 'Eliminando…' : 'Eliminar'}
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

export function EntriesTab({ data, actions }: { data: Accounts; actions: TabActions }) {
  const [busy, setBusy] = useState<string | null>(null);
  const remove = async (id: string, description: string) => {
    if (!confirm(`¿Eliminar «${description}»?`)) return;
    setBusy(id);
    await fetch(`/api/admin/cuentas/movimientos/${id}`, { method: 'DELETE' });
    setBusy(null);
    actions.reload();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-coffee-600">
          Envíos, pauta, empaque y todo lo que no sea compra de mercancía. Las ventas de la tienda se cuentan solas.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => actions.newEntry({ type: 'INCOME', category: 'Otros ingresos' })} className={secondaryButton}>
            + Ingreso
          </button>
          <button type="button" onClick={() => actions.newEntry()} className={primaryButton}>
            + Gasto
          </button>
        </div>
      </div>
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
                  {e.paidBy && ` · ${e.category === REIMBURSEMENT_CATEGORY ? 'a' : e.type === 'INCOME' ? 'recibió' : 'pagó'} ${e.paidBy}`}
                  {e.reference && ` · ${e.reference}`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className={`tabular-nums ${e.type === 'INCOME' ? 'text-green-700' : 'text-coffee-900'}`}>
                  {e.type === 'INCOME' ? '+' : '−'}
                  {formatCOP(e.amountCents)}
                </p>
                <button type="button" onClick={() => actions.editEntry(e)} className="text-xs font-medium text-coffee-800 hover:text-coffee-900">
                  Editar
                </button>
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

// ── Fiados ───────────────────────────────────────────────────────────────

const field =
  'mt-1 w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-base text-coffee-900 outline-none focus:border-coffee-600 sm:text-sm';

function AbonoForm({ credit, onSaved }: { credit: Accounts['credits'][number]; onSaved: () => void }) {
  const [form, setForm] = useState({ amount: String(Math.round(credit.balanceCents / 100)), method: 'Efectivo', date: todayInColombia(), receivedBy: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch(`/api/admin/cuentas/fiados/${credit.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: form.date, amountCents: (Number(form.amount) || 0) * 100, method: form.method, receivedBy: form.receivedBy }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(data.error ?? 'No se pudo registrar el abono.');
    onSaved();
  };
  return (
    <form onSubmit={submit} className="mt-3 rounded-xl bg-cream-100/70 p-3">
      <p className="text-xs font-semibold text-coffee-900">Registrar abono</p>
      <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="block text-xs text-coffee-700">
          Valor ($)
          <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, '') })} inputMode="numeric" required className={field} />
        </label>
        <label className="block text-xs text-coffee-700">
          Medio
          <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={field}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-coffee-700">
          Fecha
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className={field} />
        </label>
        <label className="block text-xs text-coffee-700">
          ¿Quién lo recibió?
          <input value={form.receivedBy} onChange={(e) => setForm({ ...form, receivedBy: e.target.value })} className={field} />
        </label>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? 'Guardando…' : 'Guardar abono'}
        </button>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    </form>
  );
}

export function CreditsTab({ data, actions }: { data: Accounts; actions: TabActions }) {
  const [show, setShow] = useState<'owed' | 'paid'>('owed');
  const [openId, setOpenId] = useState<string | null>(null);
  const owed = data.credits.filter((c) => c.balanceCents > 0);
  const list = show === 'owed' ? owed : data.credits.filter((c) => c.balanceCents === 0);

  const removePayment = async (id: string) => {
    if (!confirm('¿Eliminar este abono?')) return;
    await fetch(`/api/admin/cuentas/abonos/${id}`, { method: 'DELETE' });
    actions.reload();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-coffee-900">{formatCOP(data.summary.creditOwedCents)}</p>
          <p className="text-sm text-coffee-600">
            {owed.length === 1 ? 'te debe 1 persona' : `te deben ${owed.length} personas`} por fiados
          </p>
        </div>
        <Link href="/gestor?nuevo=fiado" className={primaryButton}>
          + Nuevo fiado
        </Link>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-coffee-500">
        Un fiado se registra como un pedido en el Gestor con pago «Fiado»: así descuenta las prendas del inventario. Aquí llevas lo que
        te va pagando cada persona.
      </p>

      <div className="mb-4 flex rounded-lg border border-cream-200 bg-white p-1 text-sm sm:w-fit" role="radiogroup" aria-label="Fiados">
        {(
          [
            ['owed', `Deben (${owed.length})`],
            ['paid', 'Pagados'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={show === value}
            onClick={() => setShow(value)}
            className={`flex-1 rounded-md px-4 py-1.5 transition-colors sm:flex-none ${show === value ? 'bg-coffee-900 font-medium text-cream-50' : 'text-coffee-700 hover:bg-cream-100'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty text={show === 'owed' ? 'Nadie te debe por fiados.' : 'Aún no hay fiados pagados.'} />
      ) : (
        <div className="space-y-3">
          {list.map((c) => {
            const reminder = `Hola ${c.customer.split(' ')[0]}, te escribo de AFRA para recordarte el saldo pendiente de ${formatCOP(c.balanceCents)} por ${c.items.map((i) => i.name).join(', ')}. ¡Gracias!`;
            return (
              <article key={c.id} className="rounded-2xl border border-cream-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-coffee-900">{c.customer}</p>
                    <p className="text-xs text-coffee-500">
                      {shortDate(c.date)} · {c.phone} · {c.reference}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-semibold tabular-nums ${c.balanceCents > 0 ? 'text-coffee-900' : 'text-green-700'}`}>
                      {c.balanceCents > 0 ? `Debe ${formatCOP(c.balanceCents)}` : 'Pagado'}
                    </p>
                    <p className="text-xs tabular-nums text-coffee-500">
                      de {formatCOP(c.totalCents)} · abonó {formatCOP(c.paidCents)}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-coffee-800">{itemsText(c.items)}</p>
                <div className="mt-3">
                  <Progress value={c.totalCents ? c.paidCents / c.totalCents : 0} color="#1baf7a" />
                </div>
                {c.payments.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-coffee-700">
                    {c.payments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 tabular-nums">
                        <span>
                          {shortDate(p.date)} · {p.method}
                          {p.receivedBy && ` · recibió ${p.receivedBy}`}
                        </span>
                        <span className="flex items-center gap-3">
                          {formatCOP(p.amountCents)}
                          <button type="button" onClick={() => removePayment(p.id)} className="text-red-600 hover:text-red-800">
                            Quitar
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {c.balanceCents > 0 && (
                  <>
                    <div className="mt-3 flex flex-wrap gap-4 border-t border-cream-200 pt-3 text-sm">
                      <button type="button" onClick={() => setOpenId(openId === c.id ? null : c.id)} className="font-medium text-coffee-900">
                        {openId === c.id ? 'Cerrar' : '+ Registrar abono'}
                      </button>
                      <a href={buildWhatsAppLink(c.phone, reminder)} target="_blank" rel="noopener noreferrer" className="text-[#128C7E] hover:text-[#0e6b60]">
                        Recordarle por WhatsApp
                      </a>
                    </div>
                    {openId === c.id && (
                      <AbonoForm
                        credit={c}
                        onSaved={() => {
                          setOpenId(null);
                          actions.reload();
                        }}
                      />
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── La tienda debe ───────────────────────────────────────────────────────

export function OwesTab({ data, actions }: { data: Accounts; actions: TabActions }) {
  const partnerPaid = data.movements.filter((m) => !m.storeCash);
  return (
    <div>
      <div className="mb-4">
        <p className="text-2xl font-semibold tabular-nums text-coffee-900">{formatCOP(data.summary.storeOwesCents)}</p>
        <p className="text-sm text-coffee-600">debe la tienda por cosas que ustedes pagaron de su bolsillo</p>
      </div>
      <p className="mb-5 text-xs leading-relaxed text-coffee-500">
        Cuando registras una compra o un gasto y en «¿Quién pagó?» pones a una persona (no «{STORE_PAYER}»), la tienda le queda
        debiendo ese valor. Cuando se lo devuelvan, regístralo con «Devolverle».
      </p>

      {data.storeOwes.length === 0 ? (
        <Empty text="La tienda no le debe a nadie." />
      ) : (
        <ul className="divide-y divide-cream-200 rounded-2xl border border-cream-200 bg-white">
          {data.storeOwes.map((o) => (
            <li key={o.person} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
              <div>
                <p className="font-medium text-coffee-900">{o.person}</p>
                <p className="text-xs tabular-nums text-coffee-500">
                  Pagó {formatCOP(o.paidCents)} · le han devuelto {formatCOP(o.repaidCents)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className={`text-base font-semibold tabular-nums ${o.owedCents > 0 ? 'text-coffee-900' : 'text-green-700'}`}>
                  {o.owedCents > 0 ? `Se le debe ${formatCOP(o.owedCents)}` : 'Al día'}
                </p>
                {o.owedCents > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      actions.newEntry({
                        type: 'EXPENSE',
                        category: REIMBURSEMENT_CATEGORY,
                        paidBy: o.person,
                        amount: Math.round(o.owedCents / 100),
                        description: `Devolución a ${o.person}`,
                      })
                    }
                    className={secondaryButton}
                  >
                    Devolverle
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold text-coffee-900">Pagado de su bolsillo en este periodo</h2>
      {partnerPaid.length === 0 ? (
        <Empty text="Nada en este periodo." />
      ) : (
        <ul className="divide-y divide-cream-200 rounded-2xl border border-cream-200 bg-white">
          {partnerPaid.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="text-coffee-900">{m.description}</p>
                <p className="text-xs text-coffee-500">
                  {shortDate(m.date)} · {m.category} · pagó {m.person}
                </p>
              </div>
              <p className="tabular-nums text-coffee-900">{formatCOP(m.amountCents)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Movimientos ──────────────────────────────────────────────────────────

export function MovementsTab({ data }: { data: Accounts }) {
  const [kind, setKind] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [query, setQuery] = useState('');

  // Running balance of the store's cash over the period, oldest first.
  const rows = useMemo(() => {
    let balance = 0;
    const withBalance = [...data.movements].reverse().map((m) => {
      if (m.storeCash) balance += m.type === 'INCOME' ? m.amountCents : -m.amountCents;
      return { ...m, balance };
    });
    const q = query.trim().toLowerCase();
    return withBalance
      .reverse()
      .filter((m) => (kind === 'ALL' || m.type === kind) && (!q || `${m.description} ${m.category} ${m.method} ${m.person}`.toLowerCase().includes(q)));
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
          placeholder="Buscar cliente, proveedor, persona, categoría…"
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
                <th className="px-4 py-2.5 text-right font-medium">Saldo en caja</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((m) => (
                <tr key={m.id} className={`border-t border-cream-200 ${m.storeCash ? '' : 'text-coffee-500'}`}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-coffee-700">{shortDate(m.date)}</td>
                  <td className="px-4 py-2.5">
                    <p className={m.storeCash ? 'text-coffee-900' : 'text-coffee-600'}>{m.description}</p>
                    <p className="text-xs text-coffee-500">
                      {m.source} · {m.category}
                      {m.person && ` · ${m.person}`}
                      {!m.storeCash && ' · lo pagó un socio, no salió de la caja'}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-coffee-700">{m.method}</td>
                  <td className="px-4 py-2.5 text-right text-green-700">{m.type === 'INCOME' ? formatCOP(m.amountCents) : ''}</td>
                  <td className="px-4 py-2.5 text-right">{m.type === 'EXPENSE' ? formatCOP(m.amountCents) : ''}</td>
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

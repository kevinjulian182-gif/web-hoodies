'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { formatCOP } from '@/lib/format';
import { isManualOrder, isWhatsAppOrder } from '@/lib/orderSource';
import { INTER_TRACKING_PAGE } from '@/lib/trackingLinks';
import { orderFreightOnDelivery } from '@/lib/pricing';
import { buildTrackingMessage, buildWhatsAppLink } from '@/lib/whatsapp';
import NewOrderPanel from './NewOrderPanel';
import OrderItems from '@/components/admin/OrderItems';
import type { ManagedOrder, Status } from './types';

type Stage = 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';


/** PENDING and PAID are both "por enviar"; payment is shown apart. */
const stageOf = (status: Status): Stage => (status === 'PAID' ? 'PENDING' : status);

const STAGES: { value: Exclude<Stage, 'CANCELLED'>; label: string }[] = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'SHIPPED', label: 'Enviado' },
  { value: 'DELIVERED', label: 'Entregado' },
];

const FILTERS: { value: Stage | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'SHIPPED', label: 'Enviados' },
  { value: 'DELIVERED', label: 'Entregados' },
  { value: 'CANCELLED', label: 'Cancelados' },
];

function sourceOf(order: ManagedOrder) {
  if (isManualOrder(order.wompiReference)) return { label: 'Manual', className: 'bg-coffee-900/5 text-coffee-800' };
  if (isWhatsAppOrder(order.wompiReference)) return { label: 'WhatsApp', className: 'bg-[#25D366]/15 text-[#128C4B]' };
  return { label: 'Web', className: 'bg-cream-200 text-coffee-700' };
}

function paymentOf(order: ManagedOrder) {
  if (order.paymentMethod === 'COD') return { label: 'Contra entrega', className: 'bg-amber-50 text-amber-800' };
  if (order.paymentMethod === 'TRANSFER') return { label: 'Pagado · transferencia', className: 'bg-green-50 text-green-800' };
  if (order.paymentMethod === 'CREDIT') {
    const owed = order.totalCents - (order.creditPayments ?? []).reduce((n, p) => n + p.amountCents, 0);
    return owed > 0
      ? { label: `Fiado · debe ${formatCOP(owed)}`, className: 'bg-violet-50 text-violet-800' }
      : { label: 'Fiado · pagado', className: 'bg-green-50 text-green-800' };
  }
  return order.status === 'PENDING' && !order.wompiTransactionId
    ? { label: 'Esperando pago Wompi', className: 'bg-red-50 text-red-700' }
    : { label: 'Pagado · Wompi', className: 'bg-green-50 text-green-800' };
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function OrderManagerPage() {
  const [orders, setOrders] = useState<ManagedOrder[]>([]);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [freeShippingThresholdCents, setFreeShippingThresholdCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Stage | 'ALL'>('PENDING');
  const [query, setQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ManagedOrder | null>(null);
  const [newPayment, setNewPayment] = useState<'COD' | 'CREDIT'>('COD');
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
  // Orders just changed stay on screen until the filter changes, so a card
  // doesn't vanish from "Pendientes" the moment it's marked as sent.
  const [pinned, setPinned] = useState<Set<string>>(new Set());

  const load = async () => {
    const res = await fetch('/api/admin/gestor', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
      setTrackingEnabled(data.trackingEnabled);
      setFreeShippingThresholdCents(data.freeShippingThresholdCents ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // "Nuevo fiado" from Cuentas opens the form with Fiado chosen.
    if (new URLSearchParams(window.location.search).get('nuevo') === 'fiado') {
      setNewPayment('CREDIT');
      setPanelOpen(true);
    }
  }, []);

  const counts = useMemo(() => {
    const c: Record<Stage | 'ALL', number> = { ALL: orders.length, PENDING: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 };
    for (const o of orders) c[stageOf(o.status)]++;
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== 'ALL' && stageOf(o.status) !== filter && !pinned.has(o.id)) return false;
      if (!q) return true;
      return [o.customerName, o.shippingPhone, o.wompiReference, o.trackingNumber ?? '', o.shippingCity]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [orders, filter, query, pinned]);

  const replace = (order: ManagedOrder) => {
    setPinned((prev) => new Set(prev).add(order.id));
    setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
  };

  const refreshAll = async () => {
    setRefreshing(true);
    setBanner(null);
    const res = await fetch('/api/admin/gestor/tracking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await res.json().catch(() => ({}));
    setRefreshing(false);
    if (!res.ok) return setBanner({ ok: false, text: data.error ?? 'No se pudo consultar el seguimiento.' });
    setBanner(
      data.errors?.length
        ? { ok: false, text: `Revisadas ${data.checked} guías. ${data.errors[0]}` }
        : {
            ok: true,
            text:
              data.checked === 0
                ? 'No hay guías enviadas por revisar.'
                : `Revisadas ${data.checked} guías${data.delivered ? `, ${data.delivered} ya entregadas` : ''}.`,
          }
    );
    load();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tightest text-coffee-900">Gestor de pedidos</h1>
          <p className="mt-1 text-sm text-coffee-600">
            Todos los pedidos (web, WhatsApp y manuales) con su guía y estado. Cada pedido descuenta su inventario.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshAll}
            disabled={!trackingEnabled || refreshing}
            title={trackingEnabled ? undefined : 'Activa el seguimiento automático para usarlo'}
            className="rounded-lg border border-cream-200 bg-white px-4 py-2.5 text-sm font-medium text-coffee-800 transition-colors hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? 'Consultando…' : 'Actualizar seguimiento'}
          </button>
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="rounded-lg bg-coffee-900 px-4 py-2.5 text-sm font-medium text-cream-50 transition-transform active:scale-[0.98]"
          >
            + Nuevo pedido
          </button>
        </div>
      </div>

      {!loading && !trackingEnabled && (
        <p className="mb-5 text-xs leading-relaxed text-coffee-500">
          Marca cada pedido como Enviado y Entregado a mano; «Ver en Interrapidísimo» copia la guía y abre el rastreo.
          El cambio automático a Entregado es opcional y usa un servicio de pago (TrackingMore, API key en Configuración).
        </p>
      )}

      {banner && (
        <p
          role="status"
          className={`mb-5 rounded-lg px-3 py-2.5 text-sm ${banner.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}
        >
          {banner.text}
        </p>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-cream-200 bg-white p-1" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => {
                setFilter(f.value);
                setPinned(new Set());
              }}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors ${
                filter === f.value ? 'bg-coffee-900 font-medium text-cream-50' : 'text-coffee-700 hover:bg-cream-100'
              }`}
            >
              {f.label} <span className="tabular-nums opacity-70">{counts[f.value]}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar nombre, celular, guía o referencia"
          aria-label="Buscar pedidos"
          className="min-w-[14rem] flex-1 rounded-lg border border-cream-200 bg-white px-3 py-2 text-base text-coffee-900 outline-none focus:border-coffee-600 sm:text-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-coffee-600">Cargando…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-cream-200 p-8 text-center text-sm text-coffee-600">
          {orders.length === 0 ? 'Aún no hay pedidos. Registra el primero con «+ Nuevo pedido».' : 'No hay pedidos con este filtro.'}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              trackingEnabled={trackingEnabled}
              freeShippingThresholdCents={freeShippingThresholdCents}
              onChange={replace}
              onEdit={() => setEditingOrder(order)}
            />
          ))}
        </div>
      )}

      {panelOpen && (
        <NewOrderPanel
          initialPayment={newPayment}
          onClose={() => {
            setPanelOpen(false);
            setNewPayment('COD');
          }}
          onCreated={(order) => {
            setOrders((prev) => [order, ...prev]);
            setFilter('PENDING');
            setPanelOpen(false);
            setBanner({ ok: true, text: `Pedido de ${order.customerName} registrado y descontado del inventario.` });
          }}
        />
      )}
      {editingOrder && (
        <NewOrderPanel
          editing={editingOrder}
          onClose={() => setEditingOrder(null)}
          onCreated={(order) => {
            replace(order);
            setEditingOrder(null);
            setBanner({ ok: true, text: `Pedido de ${order.customerName} actualizado.` });
          }}
        />
      )}
    </div>
  );
}

function OrderCard({
  order,
  trackingEnabled,
  freeShippingThresholdCents,
  onChange,
  onEdit,
}: {
  order: ManagedOrder;
  trackingEnabled: boolean;
  freeShippingThresholdCents: number;
  onEdit: () => void;
  onChange: (order: ManagedOrder) => void;
}) {
  const [guide, setGuide] = useState(order.trackingNumber ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const guideRef = useRef<HTMLInputElement>(null);
  const stage = stageOf(order.status);
  const cancelled = stage === 'CANCELLED';
  const source = sourceOf(order);
  const payment = paymentOf(order);

  useEffect(() => setGuide(order.trackingNumber ?? ''), [order.trackingNumber]);

  const patch = async (body: { status?: Stage; trackingNumber?: string | null }, key: string) => {
    setBusy(key);
    setNotice(null);
    const res = await fetch(`/api/admin/gestor/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setNotice({ ok: false, text: data.error ?? 'No se pudo guardar.' });
      return false;
    }
    onChange(data.order);
    if (data.email && !data.order.customerEmail) {
      setNotice({ ok: true, text: 'Guía guardada. Este pedido no tiene correo: envíasela por WhatsApp.' });
    } else if (data.email) {
      setNotice(
        data.email.ok
          ? { ok: true, text: `Guía enviada al cliente por correo (${data.order.customerEmail}).` }
          : { ok: false, text: `Guardado. No se envió el correo con la guía: ${data.email.error}` }
      );
    }
    return true;
  };

  const setStage = (target: Stage) => {
    if (target === stage) return;
    if (target === 'SHIPPED' && !guide.trim()) {
      setNotice({ ok: false, text: 'Escribe el número de guía para marcarlo como enviado.' });
      guideRef.current?.focus();
      return;
    }
    if (order.paymentMethod === 'WOMPI' && payment.label.startsWith('Esperando') && target !== 'PENDING') {
      if (!confirm('Este pedido aún no tiene el pago de Wompi confirmado. ¿Marcarlo igual?')) return;
    }
    patch({ status: target, ...(target === 'SHIPPED' ? { trackingNumber: guide.trim() } : {}) }, target);
  };

  const saveGuide = () => patch({ trackingNumber: guide.trim() || null }, 'guide');

  const cancel = () => {
    if (!confirm(`¿Cancelar el pedido de ${order.customerName}? Sus productos vuelven al inventario.`)) return;
    patch({ status: 'CANCELLED' }, 'CANCELLED');
  };

  const refreshTracking = async () => {
    setBusy('tracking');
    setNotice(null);
    const res = await fetch('/api/admin/gestor/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setNotice({ ok: false, text: data.error ?? 'No se pudo consultar la guía.' });
    const fresh = await fetch('/api/admin/gestor', { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
    const updated = fresh?.orders?.find((o: ManagedOrder) => o.id === order.id);
    if (updated) onChange(updated);
  };

  const guideDirty = guide.trim() !== (order.trackingNumber ?? '');
  const firstName = order.customerName.trim().split(/\s+/)[0];
  const trackingLink = order.trackingNumber
    ? buildWhatsAppLink(
        order.shippingPhone,
        buildTrackingMessage(
          { ...order, trackingNumber: order.trackingNumber },
          orderFreightOnDelivery(order, freeShippingThresholdCents)
        )
      )
    : '';

  // Opening wa.me is the sending; this only records that it happened.
  const markWhatsAppSent = () => {
    onChange({ ...order, whatsappTrackingSentAt: new Date().toISOString() });
    fetch(`/api/admin/gestor/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappTrackingSent: true }),
    }).catch(() => {});
  };

  return (
    <article className={`rounded-2xl border border-cream-200 bg-white p-4 sm:p-5 ${cancelled ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-coffee-900">{order.customerName}</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${source.className}`}>{source.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${payment.className}`}>{payment.label}</span>
          </div>
          <p className="mt-0.5 text-xs text-coffee-500">
            {order.wompiReference} · {shortDate(order.createdAt)}
          </p>
        </div>
        <p className="text-base font-semibold tabular-nums text-coffee-900">{formatCOP(order.totalCents)}</p>
      </div>

      <OrderItems items={order.items} />
      <p className="mt-2 text-xs text-coffee-600">
        {order.shippingAddress}
        {order.shippingAddressComplement && `, ${order.shippingAddressComplement}`} — {order.shippingCity}
        {order.shippingDepartment && `, ${order.shippingDepartment}`} · {order.shippingPhone}
      </p>

      {cancelled ? (
        <p className="mt-4 text-sm font-medium text-red-700">Cancelado · sus productos volvieron al inventario</p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-[auto_1fr]">
          <div className="flex rounded-lg border border-cream-200 bg-cream-50 p-1 text-sm" role="radiogroup" aria-label="Estado del pedido">
            {STAGES.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={stage === s.value}
                disabled={busy !== null}
                onClick={() => setStage(s.value)}
                className={`flex-1 rounded-md px-3 py-1.5 transition-colors disabled:opacity-60 lg:flex-none ${
                  stage === s.value
                    ? s.value === 'DELIVERED'
                      ? 'bg-green-700 font-medium text-white'
                      : s.value === 'SHIPPED'
                        ? 'bg-sky-700 font-medium text-white'
                        : 'bg-coffee-900 font-medium text-cream-50'
                    : 'text-coffee-700 hover:bg-white'
                }`}
              >
                {busy === s.value ? '…' : s.label}
              </button>
            ))}
          </div>

          <div className="flex min-w-0 gap-2">
            <input
              ref={guideRef}
              value={guide}
              onChange={(e) => setGuide(e.target.value.replace(/\s/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && guideDirty && saveGuide()}
              placeholder="N.º de guía Interrapidísimo"
              aria-label="Número de guía"
              inputMode="numeric"
              className="min-w-0 flex-1 rounded-lg border border-cream-200 px-3 py-2 font-mono text-base text-coffee-900 outline-none focus:border-coffee-600 sm:text-sm"
            />
            {guideDirty && (
              <button
                type="button"
                onClick={saveGuide}
                disabled={busy !== null}
                className="shrink-0 rounded-lg bg-coffee-900 px-3 py-2 text-sm font-medium text-cream-50 disabled:opacity-50"
              >
                {busy === 'guide' ? 'Guardando…' : 'Guardar guía'}
              </button>
            )}
          </div>
        </div>
      )}

      {order.trackingNumber && !cancelled && !guideDirty && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          {order.whatsappTrackingSentAt ? (
            <>
              <span className="text-xs font-medium text-[#128C4B]">✓ Guía enviada por WhatsApp · {shortDate(order.whatsappTrackingSentAt)}</span>
              <a
                href={trackingLink}
                target="_blank"
                rel="noreferrer"
                onClick={markWhatsAppSent}
                className="text-xs font-medium text-coffee-700 underline underline-offset-2 hover:text-coffee-900"
              >
                Reenviar
              </a>
            </>
          ) : (
            <a
              href={trackingLink}
              target="_blank"
              rel="noreferrer"
              onClick={markWhatsAppSent}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1f9d55] px-3.5 py-2 text-sm font-medium text-white transition-transform active:scale-[0.98]"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
              </svg>
              Enviarle la guía a {firstName} por WhatsApp
            </a>
          )}
        </div>
      )}

      {order.trackingNumber && !cancelled && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-cream-100/70 px-3 py-2 text-xs text-coffee-700">
          <span className="font-medium text-coffee-900">
            {order.trackingStatus ??
              (trackingEnabled ? 'Seguimiento: consultando a Interrapidísimo…' : 'Seguimiento automático apagado')}
          </span>
          {order.trackingCheckedAt && <span className="text-coffee-500">revisado {shortDate(order.trackingCheckedAt)}</span>}
          {order.deliveredAt && <span className="text-green-700">entregado {shortDate(order.deliveredAt)}</span>}
          <span className="ml-auto flex gap-3">
            {trackingEnabled && (
              <button type="button" onClick={refreshTracking} disabled={busy !== null} className="font-medium underline underline-offset-2 disabled:opacity-50">
                {busy === 'tracking' ? 'Consultando…' : 'Actualizar'}
              </button>
            )}
            <a
              href={INTER_TRACKING_PAGE}
              target="_blank"
              rel="noreferrer"
              onClick={() => navigator.clipboard?.writeText(order.trackingNumber!).catch(() => {})}
              className="font-medium underline underline-offset-2"
              title="Copia la guía y abre el rastreo de Interrapidísimo"
            >
              Ver en Interrapidísimo
            </a>
          </span>
        </div>
      )}

      {notice && (
        <p className={`mt-3 text-xs ${notice.ok ? 'text-green-700' : 'text-red-700'}`} role="status">
          {notice.text}
        </p>
      )}

      {!cancelled && (
        <div className="mt-3 flex flex-wrap gap-4 border-t border-cream-200 pt-3 text-sm">
          <button type="button" onClick={onEdit} disabled={busy !== null} className="font-medium text-coffee-800 hover:text-coffee-900 disabled:opacity-50">
            Editar pedido
          </button>
          <Link href={`/admin/bouchers?pedido=${order.id}`} target="_blank" className="text-coffee-700 hover:text-coffee-900">
            Boucher de envío
          </Link>
          <button type="button" onClick={cancel} disabled={busy !== null} className="text-red-600 hover:text-red-800 disabled:opacity-50">
            Cancelar pedido
          </button>
        </div>
      )}
    </article>
  );
}

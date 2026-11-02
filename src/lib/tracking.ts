import { prisma } from '@/lib/prisma';
import { getConfigValue, setConfigValue } from '@/lib/config';

// Interrapidísimo has no public tracking API, so guías are followed through
// TrackingMore (trackingmore.com), which tracks Interrapidísimo among
// 1,000+ carriers. Each guía is registered once and then read back; when
// the carrier reports it delivered, the order moves to DELIVERED on its own.

const API = 'https://api.trackingmore.com/v4';
/** TrackingMore's code for Interrapidísimo; if TrackingMore rejects it, the
 * right one is found with their courier detection and remembered. */
const DEFAULT_COURIER = 'inter-rapidisimo';


export type TrackingResult = {
  /** TrackingMore's delivery_status: pending, notfound, transit, pickup,
   * delivered, undelivered, exception, expired, inforeceived. */
  status: string;
  /** Latest event as the carrier wrote it, e.g. "En reparto - Medellín". */
  detail: string | null;
};

export async function getTrackingApiKey() {
  return (await getConfigValue('TRACKINGMORE_API_KEY'))?.trim() || null;
}

async function api(path: string, apiKey: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'Tracking-Api-Key': apiKey, ...init?.headers },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => null);
  return { httpStatus: res.status, code: Number(body?.meta?.code ?? res.status), message: String(body?.meta?.message ?? ''), data: body?.data };
}

/** Asks TrackingMore which of its carriers this guía belongs to. */
async function detectCourier(trackingNumber: string, apiKey: string): Promise<string | null> {
  const detected = await api('/couriers/detect', apiKey, {
    method: 'POST',
    body: JSON.stringify({ tracking_number: trackingNumber }),
  });
  const list = (Array.isArray(detected.data) ? detected.data : []) as { courier_code?: string; courier_name?: string }[];
  return list.find((c) => /inter\s*-?\s*rap/i.test(`${c.courier_code} ${c.courier_name}`))?.courier_code ?? null;
}

function readTracking(data: unknown): TrackingResult | null {
  const item = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (!item || typeof item !== 'object') return null;
  const events = ((item.origin_info as { trackinfo?: unknown[] } | undefined)?.trackinfo ?? []) as {
    tracking_detail?: string;
    location?: string;
  }[];
  const latest = typeof item.latest_event === 'string' && item.latest_event ? item.latest_event : null;
  const first = events[0];
  const detail = latest ?? (first ? [first.tracking_detail, first.location].filter(Boolean).join(' - ') : null);
  return { status: String(item.delivery_status ?? 'pending'), detail: detail || null };
}

/** Current state of an Interrapidísimo guía. Throws with a message the store
 * owner can act on when TrackingMore can't be used. */
export async function trackGuide(trackingNumber: string): Promise<TrackingResult> {
  const apiKey = await getTrackingApiKey();
  if (!apiKey) throw new Error('Falta la API key de TrackingMore (Configuración).');
  let courier = (await getConfigValue('TRACKINGMORE_COURIER'))?.trim() || DEFAULT_COURIER;
  const create = (code: string) =>
    api('/trackings/create', apiKey, {
      method: 'POST',
      body: JSON.stringify({ tracking_number: trackingNumber, courier_code: code }),
    });

  // "Create" registers the guía and answers with its current state; a guía
  // registered before is read back with "get" below.
  let created = await create(courier);
  if (created.httpStatus === 401 || created.code === 401) throw new Error('TrackingMore rechazó la API key.');
  if (created.code !== 200 && /courier/i.test(created.message) && !/exist/i.test(created.message)) {
    const detected = await detectCourier(trackingNumber, apiKey);
    if (detected && detected !== courier) {
      courier = detected;
      created = await create(courier);
    }
  }
  if (created.code === 200) {
    await setConfigValue('TRACKINGMORE_COURIER', courier).catch(() => {});
    const result = readTracking(created.data);
    if (result) return result;
  }

  const got = await api(
    `/trackings/get?tracking_numbers=${encodeURIComponent(trackingNumber)}&courier_code=${encodeURIComponent(courier)}`,
    apiKey
  );
  const result = got.code === 200 ? readTracking(got.data) : null;
  if (!result) throw new Error(`TrackingMore no devolvió el estado de la guía${got.message ? ` (${got.message})` : ''}.`);
  return result;
}

const STATUS_TEXT: Record<string, string> = {
  pending: 'Registrada, esperando movimiento',
  inforeceived: 'Guía creada',
  notfound: 'Aún sin movimientos',
  transit: 'En tránsito',
  pickup: 'En reparto',
  delivered: 'Entregado',
  undelivered: 'Intento de entrega fallido',
  exception: 'Novedad en el envío',
  expired: 'Sin actualizaciones recientes',
};

export function trackingStatusText(result: TrackingResult) {
  const label = STATUS_TEXT[result.status] ?? result.status;
  return result.detail ? `${label} · ${result.detail}` : label;
}

/** Reads the carrier's state for one shipped order and stores it; a
 * delivered guía marks the order DELIVERED. */
export async function refreshOrderTracking(order: { id: string; trackingNumber: string | null; status: string }) {
  if (!order.trackingNumber) return null;
  const result = await trackGuide(order.trackingNumber);
  const delivered = result.status === 'delivered';
  await prisma.order.update({
    where: { id: order.id },
    data: {
      trackingStatus: trackingStatusText(result),
      trackingCheckedAt: new Date(),
      ...(delivered && order.status === 'SHIPPED' ? { status: 'DELIVERED', deliveredAt: new Date() } : {}),
    },
  });
  return { ...result, delivered };
}

/** Refreshes every shipped order not checked in the last `minAgeMinutes`. */
export async function refreshShippedOrders(minAgeMinutes = 60) {
  if (!(await getTrackingApiKey())) return { checked: 0, delivered: 0, errors: ['Falta la API key de TrackingMore.'] };
  const cutoff = new Date(Date.now() - minAgeMinutes * 60_000);
  const orders = await prisma.order.findMany({
    where: {
      status: 'SHIPPED',
      trackingNumber: { not: null },
      OR: [{ trackingCheckedAt: null }, { trackingCheckedAt: { lt: cutoff } }],
    },
    select: { id: true, trackingNumber: true, status: true, wompiReference: true },
    take: 40,
  });
  let delivered = 0;
  const errors: string[] = [];
  for (const order of orders) {
    try {
      const result = await refreshOrderTracking(order);
      if (result?.delivered) delivered++;
    } catch (err) {
      errors.push(`${order.wompiReference}: ${err instanceof Error ? err.message : 'error'}`);
      // One bad answer (e.g. an invalid key) fails them all the same way.
      if (/API key/.test(errors[errors.length - 1])) break;
    }
  }
  return { checked: orders.length, delivered, errors };
}

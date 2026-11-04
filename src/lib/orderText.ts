import { COLOMBIA_DEPARTMENTS } from '@/lib/colombia';

// Turns a pasted message (WhatsApp, Instagram DM…) into the fields of a new
// order. This rule-based reader needs no API and understands labelled lines
// ("Nombre: …", "Cel: …") and the message the store's "Pedir por WhatsApp"
// button writes; lib/orderTextAi.ts handles free-form text when an API key
// is set. Both return the same shape, checked against the live inventory.

export type InventoryItem = { id: string; name: string; brand: string; sizes: string[]; colors: string[] };

export type ParsedOrder = {
  customerName: string | null;
  shippingPhone: string | null;
  customerDocument: string | null;
  customerEmail: string | null;
  shippingAddress: string | null;
  shippingAddressComplement: string | null;
  shippingCity: string | null;
  shippingDepartment: string | null;
  deliveryNotes: string | null;
  paymentMethod: 'COD' | 'TRANSFER' | 'CREDIT' | null;
  items: { productId: string; size: string | null; color: string | null; quantity: number }[];
};

export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const LABELS: [keyof ParsedOrder, RegExp][] = [
  ['customerName', /^(nombre(?: completo)?|cliente|a nombre de|destinatario|recibe)$/],
  ['shippingPhone', /^(cel(?:ular)?|tel(?:efono)?|whatsapp|wpp|numero|contacto|movil)$/],
  ['customerDocument', /^(cedula|cc|c\.c\.?|documento|identificacion|nit)$/],
  ['customerEmail', /^(correo|email|e-mail|mail)$/],
  ['shippingAddress', /^(direccion|dir)$/],
  ['shippingAddressComplement', /^(apto|apartamento|torre|barrio|complemento|interior|casa|conjunto)$/],
  ['shippingCity', /^(ciudad|municipio)$/],
  ['shippingDepartment', /^(departamento|depto|dpto)$/],
  ['deliveryNotes', /^(indicaciones|nota|notas|observacion|observaciones)$/],
];

const ADDRESS_HINT = /\b(calle|cl|cll|carrera|cra|kr|kra|avenida|av|diagonal|dg|transversal|tv|circular|autopista|manzana|mz)\b|#/i;
const GREETING = /^(hola|buen[oa]s?|saludos|gracias|quiero|quisiera|me gustaria|pedido|mi pedido|subtotal|total|envio)/;

/** A Colombian mobile (10 digits starting with 3), without the +57. */
function findPhone(text: string): string | null {
  for (const match of text.matchAll(/(?:\+?57[\s-]?)?(3\d{2})[\s.-]?(\d{3})[\s.-]?(\d{4})\b/g)) {
    return `${match[1]}${match[2]}${match[3]}`;
  }
  return null;
}

function findDepartment(text: string): string | null {
  const n = norm(text);
  // Longest first, so "Norte de Santander" wins over "Santander".
  const sorted = [...COLOMBIA_DEPARTMENTS].sort((a, b) => b.length - a.length);
  return sorted.find((d) => new RegExp(`\\b${norm(d).replace(/[.]/g, '\\.?')}\\b`).test(n)) ?? null;
}

function matchProductLine(line: string, inventory: InventoryItem[]) {
  const n = norm(line);
  const product = [...inventory]
    .sort((a, b) => b.name.length - a.name.length)
    .find((p) => n.includes(norm(p.name)));
  if (!product) return null;
  const qty = n.match(/(?:^|[•\-*]\s*)(\d{1,2})\s*(?:x|×|und|unidad(?:es)?|uds?)?\s/)?.[1] ?? n.match(/\b(\d{1,2})\s*(?:x|×)\b/)?.[1];
  const sizeToken = n.match(/talla\s*([a-z0-9]{1,4})\b/)?.[1];
  const size =
    product.sizes.find((s) => norm(s) === sizeToken) ??
    // Bare sizes ("M", "XL") only count as whole words.
    [...product.sizes].sort((a, b) => b.length - a.length).find((s) => new RegExp(`(^|[\\s,(/])${norm(s)}($|[\\s,)/.])`).test(n)) ??
    null;
  const color = product.colors.find((c) => n.includes(norm(c))) ?? (product.colors.length === 1 ? product.colors[0] : null);
  return { productId: product.id, size, color, quantity: Math.max(1, Number(qty) || 1) };
}

export function parseOrderText(text: string, inventory: InventoryItem[]): ParsedOrder {
  const out: ParsedOrder = {
    customerName: null,
    shippingPhone: null,
    customerDocument: null,
    customerEmail: null,
    shippingAddress: null,
    shippingAddressComplement: null,
    shippingCity: null,
    shippingDepartment: null,
    deliveryNotes: null,
    paymentMethod: null,
    items: [],
  };
  const lines = text
    .replace(/[*_~]/g, '')
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•\-–>]+/, '').trim())
    .filter(Boolean);
  const unlabelled: string[] = [];

  for (const line of lines) {
    const labelled = line.match(/^([^:]{2,30}?)\s*[:=]\s*(.+)$/);
    const key = labelled && LABELS.find(([, re]) => re.test(norm(labelled[1]).replace(/[^a-z. -]/g, '').trim()))?.[0];
    if (labelled && key) {
      const value = labelled[2].trim();
      if (out[key] === null) (out as Record<string, unknown>)[key] = value;
      continue;
    }
    const item = matchProductLine(line, inventory);
    if (item) {
      out.items.push(item);
      continue;
    }
    unlabelled.push(line);
  }

  // Values cleaned up and filled from anywhere in the text when unlabelled.
  out.shippingPhone = findPhone(out.shippingPhone ?? '') ?? findPhone(text);
  out.customerDocument = out.customerDocument?.replace(/[^\d]/g, '') || text.match(/\b(?:c\.?c\.?|c[eé]dula)\s*[:#]?\s*([\d.\s]{6,14}\d)/i)?.[1].replace(/\D/g, '') || null;
  out.customerEmail = out.customerEmail?.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0] ?? text.match(/[^\s@:]+@[^\s@]+\.[a-z]{2,}/i)?.[0] ?? null;

  // "Medellín, Antioquia" in the city line: split off the department.
  if (out.shippingCity) {
    const [city, ...rest] = out.shippingCity.split(/[,–]|\s-\s/);
    const dept = rest.length ? findDepartment(rest.join(' ')) : null;
    if (dept) {
      out.shippingDepartment ??= dept;
      out.shippingCity = city.trim();
    }
  }
  if (out.shippingDepartment) out.shippingDepartment = findDepartment(out.shippingDepartment) ?? out.shippingDepartment;
  else out.shippingDepartment = findDepartment(text);

  // Unlabelled messages ("Juan Pérez / Calle 10 # 5-20 / 300…"): best guesses.
  for (const line of unlabelled) {
    const n = norm(line);
    const intro = line.match(/(?:\bsoy|mi nombre es|me llamo)\s+([a-záéíóúñü]+(?:\s+[a-záéíóúñü]+){1,3})/i);
    const [cityPart, ...deptParts] = line.split(',');
    if (!out.customerName && intro) {
      out.customerName = intro[1].trim();
    } else if (!out.shippingAddress && ADDRESS_HINT.test(line) && /\d/.test(line)) {
      out.shippingAddress = line;
    } else if (!out.shippingCity && deptParts.length && !/\d/.test(line) && findDepartment(deptParts.join(' '))) {
      out.shippingCity = cityPart.trim();
    } else if (
      !out.customerName &&
      !GREETING.test(n) &&
      !/\d/.test(line) &&
      /^[a-zñ ]+$/.test(n) &&
      n.split(' ').length >= 2 &&
      n.split(' ').length <= 5 &&
      !findDepartment(line)
    ) {
      out.customerName = line;
    }
  }

  // The shipping line ("Envío: lo pago al recibir") says nothing about payment.
  const n = norm(lines.filter((l) => !/^env[ií]o/i.test(l)).join(' '));
  if (/\bfiad[oa]s?\b|me lo fias|a credito/.test(n)) out.paymentMethod = 'CREDIT';
  else if (/contra ?entrega|pag(?:o|ar|a) (?:en efectivo )?(?:al recibir|en casa)/.test(n)) out.paymentMethod = 'COD';
  else if (/transferencia|nequi|daviplata|bancolombia|ya pag|consignaci|pagado/.test(n)) out.paymentMethod = 'TRANSFER';

  return out;
}

/** Keeps only what exists in the inventory (ids, sizes, colors). */
export function checkAgainstInventory(order: ParsedOrder, inventory: InventoryItem[]): ParsedOrder {
  const byId = new Map(inventory.map((p) => [p.id, p]));
  const items = order.items.flatMap((i) => {
    const p = byId.get(i.productId);
    if (!p) return [];
    const size = p.sizes.find((s) => norm(s) === norm(i.size ?? '')) ?? null;
    const color = p.colors.find((c) => norm(c) === norm(i.color ?? '')) ?? (p.colors.length === 1 ? p.colors[0] : null);
    return [{ productId: p.id, size, color, quantity: Math.min(99, Math.max(1, Math.round(i.quantity) || 1)) }];
  });
  const department = order.shippingDepartment ? findDepartment(order.shippingDepartment) : null;
  return { ...order, shippingDepartment: department, shippingPhone: order.shippingPhone ? findPhone(order.shippingPhone) ?? order.shippingPhone : null, items };
}

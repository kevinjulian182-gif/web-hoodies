// A product's size chart: measurement columns, and one row of values per
// size keyed by the size label, so rows always follow whatever sizes the
// product carries (adding/removing a size in the admin never shifts values
// onto the wrong row).
export type SizeChart = {
  columns: string[];
  rows: Record<string, string[]>;
  note?: string;
};

export const SUGGESTED_SIZE_COLUMNS = ['Pecho (cm)', 'Largo (cm)', 'Manga (cm)'];

/** Product.sizeChart comes back from Prisma as `JsonValue | null` — narrow it
 * to the shape the UI uses, or null when absent/malformed. */
export function parseSizeChart(value: unknown): SizeChart | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.columns) || !v.columns.every((c) => typeof c === 'string')) return null;
  if (!v.rows || typeof v.rows !== 'object' || Array.isArray(v.rows)) return null;
  const rows: Record<string, string[]> = {};
  for (const [size, values] of Object.entries(v.rows as Record<string, unknown>)) {
    if (Array.isArray(values)) rows[size] = values.map((x) => (typeof x === 'string' ? x : ''));
  }
  return { columns: v.columns as string[], rows, note: typeof v.note === 'string' ? v.note : undefined };
}

/** True when the chart has at least one filled-in measurement for the given sizes. */
export function hasSizeChartData(chart: SizeChart | null, sizes: string[]): chart is SizeChart {
  if (!chart || chart.columns.length === 0) return false;
  return sizes.some((s) => chart.rows[s]?.some((value) => value.trim() !== ''));
}

// ── Generic size guides ──────────────────────────────────────────────────
// Every product gets a size guide, even when nobody filled one in: the
// product's own chart wins, then the store-wide chart from Admin >
// Contenido (for tops), then these built-in references picked by garment
// type. Values are typical streetwear garment measurements laid flat.

const NOTE =
  'Medidas aproximadas de la prenda en plano; pueden variar un poco según la marca. Si estás entre dos tallas, elige la más grande para un calce más relajado.';

const GENERIC_TOPS: SizeChart = {
  columns: ['Pecho (cm)', 'Largo (cm)', 'Manga (cm)'],
  rows: {
    XS: ['50', '67', '60'],
    S: ['53', '69', '61'],
    M: ['56', '71', '62'],
    L: ['59', '73', '63'],
    XL: ['62', '75', '64'],
    XXL: ['65', '77', '65'],
    XXXL: ['68', '79', '66'],
  },
  note: NOTE,
};

const GENERIC_BOTTOMS: SizeChart = {
  columns: ['Cintura (cm)', 'Cadera (cm)', 'Largo (cm)'],
  rows: {
    XS: ['68-72', '88-92', '98'],
    S: ['72-76', '92-96', '100'],
    M: ['76-82', '96-102', '102'],
    L: ['82-88', '102-108', '104'],
    XL: ['88-94', '108-114', '106'],
    XXL: ['94-100', '114-120', '108'],
    XXXL: ['100-106', '120-126', '110'],
    '28': ['71', '91', '100'],
    '30': ['76', '96', '101'],
    '32': ['81', '101', '102'],
    '34': ['86', '106', '104'],
    '36': ['91', '111', '105'],
    '38': ['96', '116', '106'],
    '40': ['101', '121', '107'],
  },
  note: 'Cintura y cadera medidas sobre el cuerpo; largo de la prenda desde la cintura hasta el bota. Si estás entre dos tallas, elige la más grande.',
};

const GENERIC_SHORTS: SizeChart = {
  columns: ['Cintura (cm)', 'Cadera (cm)', 'Largo (cm)'],
  rows: {
    XS: ['68-72', '88-92', '46'],
    S: ['72-76', '92-96', '48'],
    M: ['76-82', '96-102', '50'],
    L: ['82-88', '102-108', '52'],
    XL: ['88-94', '108-114', '54'],
    XXL: ['94-100', '114-120', '56'],
    XXXL: ['100-106', '120-126', '58'],
  },
  note: GENERIC_BOTTOMS.note,
};

const GENERIC_CAPS: SizeChart = {
  columns: ['Circunferencia de cabeza (cm)'],
  rows: {
    UNICA: ['55-61 (ajustable)'],
    'S/M': ['55-58'],
    'L/XL': ['58-61'],
    S: ['54-55'],
    M: ['56-57'],
    L: ['58-59'],
    XL: ['60-61'],
  },
  note: 'Mide el contorno de tu cabeza a la altura de la frente, un dedo por encima de las orejas.',
};

const GENERIC_SOCKS: SizeChart = {
  columns: ['Talla de calzado (COL)'],
  rows: {
    UNICA: ['36-43'],
    S: ['34-36'],
    M: ['37-40'],
    L: ['41-44'],
    XL: ['45-47'],
  },
  note: 'Equivalencia aproximada con tu talla de calzado.',
};

type GarmentKind = 'tops' | 'bottoms' | 'shorts' | 'caps' | 'socks';

function garmentKind(text: string): GarmentKind | null {
  const t = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Tops first: "sudadera con capucha" is a hoodie, not joggers.
  if (/(hoodie|capucha|buzo|camis|chaqueta|crew|sweater|sueter|polo|jacket|tee|top\b|chompa|chaleco)/.test(t)) return 'tops';
  if (/(short|bermuda|pantaloneta)/.test(t)) return 'shorts';
  if (/(pantalon|jogger|jean|cargo|sudadera|trouser|pant\b|pants)/.test(t)) return 'bottoms';
  if (/(gorra|cap\b|beanie|gorro|bucket|sombrero|visera)/.test(t)) return 'caps';
  if (/(media|calcet|sock)/.test(t)) return 'socks';
  return null;
}

/** Canonical form for matching a product's size label against chart rows:
 * case/spacing-insensitive, "2XL"→"XXL", "3XL"→"XXXL", "Única"→"UNICA". */
export function normalizeSize(size: string): string {
  const s = size.trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');
  const m = /^(\d)XL$/.exec(s);
  if (m) return 'X'.repeat(Number(m[1])) + 'L';
  if (s === 'TALLAUNICA' || s === 'ONESIZE' || s === 'OS' || s === 'U') return 'UNICA';
  return s;
}

function rowFor(chart: SizeChart, size: string): string[] | undefined {
  const direct = chart.rows[size];
  if (direct?.some((v) => v.trim() !== '')) return direct;
  const key = normalizeSize(size);
  for (const [label, values] of Object.entries(chart.rows)) {
    if (normalizeSize(label) === key && values.some((v) => v.trim() !== '')) return values;
  }
  return undefined;
}

export type SizeGuideRow = { label: string; values: string[]; productSize?: string };
export type ResolvedSizeGuide = { columns: string[]; rows: SizeGuideRow[]; note?: string };

function guideFrom(chart: SizeChart, sizes: string[]): ResolvedSizeGuide | null {
  if (chart.columns.length === 0) return null;
  const matched = sizes
    .map((size) => ({ size, values: rowFor(chart, size) }))
    .filter((r): r is { size: string; values: string[] } => Boolean(r.values))
    .map(({ size, values }) => ({ label: size, values, productSize: size }));
  if (matched.length === 0) return null;
  return { columns: chart.columns, rows: matched, note: chart.note };
}

/**
 * The size guide a product page shows. Rows follow the product's own sizes;
 * if none of them appear in the matching generic chart (an unusual label),
 * the whole generic chart is shown as a reference instead of hiding the
 * guide.
 */
export function resolveSizeGuide(
  product: { sizes: string[]; sizeChart: unknown; category?: string | null; name?: string },
  storeChart: SizeChart | null,
): ResolvedSizeGuide {
  const own = parseSizeChart(product.sizeChart);
  const fromOwn = own && guideFrom(own, product.sizes);
  if (fromOwn) return fromOwn;

  // The admin-set category decides; the name is only a hint when the
  // category is missing or unrecognized ("Nike Tech Fleece" under Pantalón).
  const kind = garmentKind(product.category ?? '') ?? garmentKind(product.name ?? '') ?? 'tops';
  const generic =
    kind === 'bottoms' ? GENERIC_BOTTOMS
    : kind === 'shorts' ? GENERIC_SHORTS
    : kind === 'caps' ? GENERIC_CAPS
    : kind === 'socks' ? GENERIC_SOCKS
    : GENERIC_TOPS;

  // For tops, the admin's store-wide chart replaces the built-in one; when it
  // uses the same columns, built-in rows fill any size it doesn't list (2XL…).
  if (kind === 'tops' && storeChart) {
    const sameColumns = storeChart.columns.join('|').toLowerCase() === generic.columns.join('|').toLowerCase();
    const chart = sameColumns ? { ...storeChart, rows: { ...generic.rows, ...storeChart.rows } } : storeChart;
    const fromStore = guideFrom(chart, product.sizes);
    if (fromStore) return fromStore;
  }
  const fromGeneric = guideFrom(generic, product.sizes);
  if (fromGeneric) return fromGeneric;

  return {
    columns: generic.columns,
    rows: Object.entries(generic.rows).map(([label, values]) => ({
      label: label === 'UNICA' ? 'Única' : label,
      values,
      productSize: product.sizes.find((s) => normalizeSize(s) === normalizeSize(label)),
    })),
    note: generic.note,
  };
}

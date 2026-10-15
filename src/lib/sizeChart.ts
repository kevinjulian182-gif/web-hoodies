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

/** Common color names (Spanish) mapped to a swatch hex. Unknown names fall back to a neutral dot. */
const COLOR_HEX: Record<string, string> = {
  negro: '#1a1512',
  blanco: '#fdfcfa',
  crema: '#f2e9dd',
  beige: '#e3d5bd',
  café: '#4a3728',
  marron: '#4a3728',
  gris: '#8a8580',
  'gris oscuro': '#4b4844',
  azul: '#2b4c7e',
  'azul marino': '#1c2b45',
  verde: '#3f5b3f',
  'verde militar': '#4b5320',
  rojo: '#8c2f2f',
  vino: '#5c2331',
  amarillo: '#d9b64e',
  naranja: '#c96a34',
  rosado: '#d99aa3',
  morado: '#5b4370',
  camuflado: '#5c5c47',
  dorado: '#b08d3e',
  plateado: '#b7b7b2',
};

/** Resolves a color name to a swatch hex: an admin-picked override for this
 * product takes priority, then the shared name-based guess, then a neutral
 * gray for anything unrecognized and unset. */
export function colorToHex(name: string, overrides?: Record<string, string>): string {
  return overrides?.[name] || COLOR_HEX[name.trim().toLowerCase()] || '#a39c8f';
}

export const COMMON_COLORS = Object.keys(COLOR_HEX);

export type ColorImages = Record<string, string[]>;

/** Product.colorImages comes back from Prisma as `Prisma.JsonValue | null` —
 * narrow it to the shape the UI actually uses, discarding anything malformed
 * instead of throwing (e.g. a product saved before this field existed). */
export function parseColorImages(value: unknown): ColorImages {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: ColorImages = {};
  for (const [color, urls] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(urls) && urls.every((u) => typeof u === 'string')) {
      result[color] = urls;
    }
  }
  return result;
}

const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Product.colorHex comes back from Prisma as `Prisma.JsonValue | null` —
 * narrow it to a color name -> hex map, dropping anything that isn't a
 * valid 6-digit hex (e.g. hand-edited JSON or a product saved before this
 * field existed). */
export function parseColorHex(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const [color, hex] of Object.entries(value as Record<string, unknown>)) {
    if (typeof hex === 'string' && HEX_RE.test(hex)) {
      result[color] = hex;
    }
  }
  return result;
}

/** Runtime-configurable color theme: an admin picks one hex per family
 * (the darkest coffee shade, the lightest cream shade) and the rest of the
 * 6-step / 4-step scale is derived by shifting lightness while holding hue
 * and saturation fixed — the deltas below were reverse-engineered from the
 * original hand-tuned palette so a freshly picked anchor still produces a
 * coherent ramp instead of admin having to pick 10 coordinated hex values. */

type RGB = { r: number; g: number; b: number };
type HSL = { h: number; s: number; l: number };

function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l };
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
  else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
  else h = 60 * ((rn - gn) / delta + 4);
  if (h < 0) h += 360;
  return { h, s, l };
}

function hslToRgb({ h, s, l }: HSL): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function shiftLightness(anchor: HSL, deltaPercent: number): RGB {
  return hslToRgb({ h: anchor.h, s: anchor.s, l: clamp01(anchor.l + deltaPercent / 100) });
}

function rgbTriplet({ r, g, b }: RGB): string {
  return `${r} ${g} ${b}`;
}

// Lightness deltas from the anchor shade, derived from the original palette.
const COFFEE_DELTAS = { 800: 4.9, 700: 10.8, 600: 18.0, 500: 25.7, 400: 35.5 } as const;
const CREAM_DELTAS = { 100: -4.1, 200: -10.0, 300: -19.0 } as const;

export type ThemeVars = Record<string, string>;

const HEX_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function safeHex(hex: string, fallback: string): string {
  return HEX_PATTERN.test(hex) ? hex : fallback;
}

/** coffeeHex is treated as the coffee-900 anchor; creamHex as cream-50.
 * Falls back to the default anchors for either value that isn't a valid
 * hex color, so a malformed admin-entered value can't break every page. */
export function generateThemeVars(coffeeHex: string, creamHex: string): ThemeVars {
  const coffeeAnchor = rgbToHsl(hexToRgb(safeHex(coffeeHex, '#291C13')));
  const creamAnchor = rgbToHsl(hexToRgb(safeHex(creamHex, '#FBF6EC')));

  const vars: ThemeVars = {
    '--color-coffee-900': rgbTriplet(hexToRgb(coffeeHex)),
    '--color-cream-50': rgbTriplet(hexToRgb(creamHex)),
  };
  for (const [shade, delta] of Object.entries(COFFEE_DELTAS)) {
    vars[`--color-coffee-${shade}`] = rgbTriplet(shiftLightness(coffeeAnchor, delta));
  }
  for (const [shade, delta] of Object.entries(CREAM_DELTAS)) {
    vars[`--color-cream-${shade}`] = rgbTriplet(shiftLightness(creamAnchor, delta));
  }
  return vars;
}

export function themeVarsToCss(vars: ThemeVars): string {
  const decls = Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');
  return `:root { ${decls} }`;
}

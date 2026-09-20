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

export function colorToHex(name: string): string {
  return COLOR_HEX[name.trim().toLowerCase()] ?? '#a39c8f';
}

export const COMMON_COLORS = Object.keys(COLOR_HEX);

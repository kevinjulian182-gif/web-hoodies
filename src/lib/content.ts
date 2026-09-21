import { prisma } from '@/lib/prisma';

export const CONTENT_DEFAULTS = {
  'site.title': 'AFRA — Streetwear de lujo',
  'site.description': 'Hoodies, sudaderas y chaquetas de las marcas más exclusivas.',
  'hero.eyebrow': 'Colección permanente',
  'hero.title_line1': 'Streetwear',
  'hero.title_line2': 'de élite.',
  'hero.subtitle': 'Piezas originales de las marcas más exclusivas. Curado para quienes exigen lo mejor.',
  'hero.cta': 'Explorar colección',
  'hero.video_url': '',
  'hero.images': '[]',
  'spotlight.eyebrow': 'La filosofía AFRA',
  'spotlight.title': 'No seguimos tendencias.',
  'spotlight.title_line2': 'Las curamos.',
  'spotlight.body':
    'Cada temporada revisamos cientos de piezas para quedarnos con las que de verdad importan. Menos ruido, más carácter — streetwear que se viste como una declaración, no como una copia.',
  'spotlight.cta': 'Conoce nuestra historia',
  'trust.item1_title': 'Pago contra entrega',
  'trust.item1_body': 'Recibe tu pedido y paga en la puerta de tu casa. Sin adelantos, sin riesgos.',
  'trust.item2_title': 'Calidad garantizada',
  'trust.item2_body': 'Cada pieza pasa por control de calidad antes de salir de bodega. 100% original.',
  'trust.item3_title': 'Materiales premium',
  'trust.item3_body': 'Algodón pesado, felpa francesa y acabados que resisten el uso diario por años.',
  'home.newsletter_title': 'Sé el primero en enterarte',
  'home.newsletter_body': 'Lanzamientos exclusivos y promociones, directo a tu correo.',
  'nosotros.eyebrow': 'Sobre nosotros',
  'nosotros.title_line1': 'Streetwear que se gana',
  'nosotros.title_line2': 'su lugar en tu clóset.',
  'nosotros.intro':
    'AFRA nació de una obsesión simple: reunir en un solo lugar las piezas de streetwear que de verdad valen la pena, sin relleno y sin réplicas. Curamos, no acumulamos.',
  'nosotros.value1_title': 'Curaduría exigente',
  'nosotros.value1_body':
    'No vendemos de todo. Cada marca y cada pieza pasa un filtro estricto de diseño, calidad y relevancia cultural antes de entrar al catálogo.',
  'nosotros.value2_title': 'Autenticidad sin excepciones',
  'nosotros.value2_body':
    'Trabajamos directamente con distribuidores autorizados. Cada prenda es 100% original, verificable y respaldada.',
  'nosotros.value3_title': 'Servicio de cerca',
  'nosotros.value3_body':
    'Pago contra entrega, seguimiento real de tu pedido y un equipo que responde — no un bot genérico.',
  'footer.tagline':
    'Streetwear de élite. Piezas originales de las marcas más exclusivas, curadas para quienes exigen lo mejor.',
  'site.favicon_url': '',
  'site.logo_url': '',
  'home.sections': JSON.stringify([
    { id: 'hero', visible: true },
    { id: 'spotlight', visible: true },
    { id: 'products', visible: true },
    { id: 'trust', visible: true },
    { id: 'newsletter', visible: true },
  ]),
} as const;

export const HOME_SECTIONS = [
  { id: 'hero', label: 'Portada (Hero)' },
  { id: 'spotlight', label: 'Sección editorial' },
  { id: 'products', label: 'Catálogo destacado' },
  { id: 'trust', label: 'Sección de confianza' },
  { id: 'newsletter', label: 'Newsletter' },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]['id'];
export type HomeSectionEntry = { id: HomeSectionId; visible: boolean };

/** Parses the saved home section list (order + show/hide), dropping unknown
 * ids and appending any registry section missing from a stale saved list
 * (e.g. after a new section type ships) as visible by default. */
export function getHomeSectionEntries(content: SiteContent): HomeSectionEntry[] {
  const validIds = HOME_SECTIONS.map((s) => s.id) as string[];
  let saved: HomeSectionEntry[] = [];
  try {
    saved = JSON.parse(content['home.sections']);
  } catch {
    saved = [];
  }
  const known = saved.filter((e) => e && validIds.includes(e.id));
  const knownIds = known.map((e) => e.id) as string[];
  const missing = validIds
    .filter((id) => !knownIds.includes(id))
    .map((id) => ({ id: id as HomeSectionId, visible: true }));
  return [...known, ...missing];
}

export function getHomeSectionOrder(content: SiteContent): HomeSectionId[] {
  return getHomeSectionEntries(content)
    .filter((e) => e.visible)
    .map((e) => e.id);
}

export function getHeroImages(content: SiteContent): string[] {
  try {
    const parsed = JSON.parse(content['hero.images']);
    return Array.isArray(parsed) ? parsed.filter((url) => typeof url === 'string') : [];
  } catch {
    return [];
  }
}

export type ContentKey = keyof typeof CONTENT_DEFAULTS;
export type SiteContent = Record<ContentKey, string>;

export const CONTENT_FIELDS: Array<{
  key: ContentKey;
  label: string;
  section: string;
  multiline?: boolean;
  type?: 'text' | 'video' | 'image' | 'images';
}> = [
  { key: 'site.title', label: 'Título del sitio (pestaña del navegador)', section: 'General del sitio' },
  {
    key: 'site.description',
    label: 'Descripción para buscadores (SEO)',
    section: 'General del sitio',
    multiline: true,
  },
  {
    key: 'site.logo_url',
    label: 'Logo del navbar (opcional)',
    section: 'General del sitio',
    type: 'image',
  },
  { key: 'site.favicon_url', label: 'Favicon', section: 'General del sitio', type: 'image' },
  { key: 'hero.eyebrow', label: 'Texto superior', section: 'Portada (Hero)' },
  { key: 'hero.title_line1', label: 'Título — línea 1', section: 'Portada (Hero)' },
  { key: 'hero.title_line2', label: 'Título — línea 2', section: 'Portada (Hero)' },
  { key: 'hero.subtitle', label: 'Subtítulo', section: 'Portada (Hero)', multiline: true },
  { key: 'hero.cta', label: 'Texto del botón', section: 'Portada (Hero)' },
  { key: 'hero.video_url', label: 'Video de fondo', section: 'Portada (Hero)', type: 'video' },
  { key: 'hero.images', label: 'Imágenes de fondo (carrusel)', section: 'Portada (Hero)', type: 'images' },
  { key: 'spotlight.eyebrow', label: 'Texto superior', section: 'Sección editorial' },
  { key: 'spotlight.title', label: 'Título — línea 1', section: 'Sección editorial' },
  { key: 'spotlight.title_line2', label: 'Título — línea 2', section: 'Sección editorial' },
  { key: 'spotlight.body', label: 'Texto', section: 'Sección editorial', multiline: true },
  { key: 'spotlight.cta', label: 'Texto del botón', section: 'Sección editorial' },
  { key: 'trust.item1_title', label: 'Título 1', section: 'Sección de confianza' },
  { key: 'trust.item1_body', label: 'Texto 1', section: 'Sección de confianza', multiline: true },
  { key: 'trust.item2_title', label: 'Título 2', section: 'Sección de confianza' },
  { key: 'trust.item2_body', label: 'Texto 2', section: 'Sección de confianza', multiline: true },
  { key: 'trust.item3_title', label: 'Título 3', section: 'Sección de confianza' },
  { key: 'trust.item3_body', label: 'Texto 3', section: 'Sección de confianza', multiline: true },
  { key: 'home.newsletter_title', label: 'Título', section: 'Newsletter (inicio)' },
  { key: 'home.newsletter_body', label: 'Texto', section: 'Newsletter (inicio)' },
  { key: 'nosotros.eyebrow', label: 'Texto superior', section: 'Sobre nosotros' },
  { key: 'nosotros.title_line1', label: 'Título — línea 1', section: 'Sobre nosotros' },
  { key: 'nosotros.title_line2', label: 'Título — línea 2', section: 'Sobre nosotros' },
  { key: 'nosotros.intro', label: 'Párrafo introductorio', section: 'Sobre nosotros', multiline: true },
  { key: 'nosotros.value1_title', label: 'Valor 1 — título', section: 'Sobre nosotros' },
  { key: 'nosotros.value1_body', label: 'Valor 1 — texto', section: 'Sobre nosotros', multiline: true },
  { key: 'nosotros.value2_title', label: 'Valor 2 — título', section: 'Sobre nosotros' },
  { key: 'nosotros.value2_body', label: 'Valor 2 — texto', section: 'Sobre nosotros', multiline: true },
  { key: 'nosotros.value3_title', label: 'Valor 3 — título', section: 'Sobre nosotros' },
  { key: 'nosotros.value3_body', label: 'Valor 3 — texto', section: 'Sobre nosotros', multiline: true },
  { key: 'footer.tagline', label: 'Descripción de la marca', section: 'Pie de página', multiline: true },
];

export async function getSiteContent(): Promise<SiteContent> {
  const rows = await prisma.siteContent.findMany();
  const overrides = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...CONTENT_DEFAULTS, ...overrides } as SiteContent;
}

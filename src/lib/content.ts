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
  'footer.copyright_year': String(new Date().getFullYear()),
  'social.instagram_url': '',
  'social.tiktok_url': '',
  'social.facebook_url': '',
  'social.x_url': '',
  'site.favicon_url': '',
  'site.logo_url': '',
  'brands.items': JSON.stringify([
    { name: 'Nike', logoUrl: '' },
    { name: 'Supreme', logoUrl: '' },
    { name: 'Essentials', logoUrl: '' },
    { name: 'Bape', logoUrl: '' },
  ]),
  'faq.items': JSON.stringify([
    {
      question: '¿Cómo funciona el pago contra entrega?',
      answer:
        'Haces tu pedido sin pagar nada por adelantado. Un mensajero de Inter Rapidísimo te lo lleva a la puerta y pagas ahí mismo, en efectivo o con datáfono.',
    },
    {
      question: '¿Cuánto tarda el envío?',
      answer: 'Entre 2 y 5 días hábiles según tu ciudad. Recibes el número de guía para hacer seguimiento en tiempo real.',
    },
    {
      question: '¿Los productos son originales?',
      answer: 'Sí. Trabajamos con distribuidores autorizados y cada pieza pasa control de calidad antes de salir de bodega.',
    },
    {
      question: '¿Puedo cambiar o devolver una prenda?',
      answer: 'Sí, tienes 8 días desde que recibes tu pedido para solicitar cambio de talla o devolución, siempre que la prenda esté sin usar.',
    },
  ]),
  'howwork.eyebrow': 'Cómo trabajamos',
  'howwork.title': 'De la bodega a tu puerta, sin sorpresas.',
  'howwork.step1_title': 'Eliges tu pieza',
  'howwork.step1_body': 'Explora el catálogo y arma tu pedido con la talla y el color que quieras.',
  'howwork.step2_title': 'Confirmamos por WhatsApp',
  'howwork.step2_body': 'Verificamos disponibilidad y tu dirección antes de despachar, sin letras chiquitas.',
  'howwork.step3_title': 'Empacamos con cuidado',
  'howwork.step3_body': 'Cada prenda pasa control de calidad y va protegida para el viaje.',
  'howwork.step4_title': 'Pagas al recibir',
  'howwork.step4_body': 'Revisas tu pedido en la puerta de tu casa y pagas contra entrega.',
  'shipping.eyebrow': 'Envíos seguros',
  'shipping.title': 'Tu pedido, cuidado en cada kilómetro.',
  'shipping.body':
    'Trabajamos con Inter Rapidísimo en toda Colombia, con seguimiento real y empaque que protege cada prenda del bodegaje al último kilómetro.',
  'shipping.item1_title': 'Guía de seguimiento',
  'shipping.item1_body': 'Recibes tu número de guía apenas despachamos, para rastrear tu pedido en cualquier momento.',
  'shipping.item2_title': 'Empaque protegido',
  'shipping.item2_body': 'Bolsas selladas y refuerzo en cada envío para que tu pieza llegue impecable.',
  'shipping.item3_title': 'Cobertura nacional',
  'shipping.item3_body': 'Llegamos a las principales ciudades y municipios de Colombia.',
  'quality.eyebrow': 'Materiales e importación',
  'quality.title': 'Calidad que se siente al tacto.',
  'quality.body':
    'Importamos directamente de distribuidores autorizados y verificamos cada lote antes de que llegue a nuestra bodega. Nada de intermediarios dudosos.',
  'quality.item1_title': 'Algodón pesado',
  'quality.item1_body': 'Felpa francesa y algodón de gramaje alto que resisten el uso diario por años.',
  'quality.item2_title': 'Control de calidad',
  'quality.item2_body': 'Revisamos costuras, estampados y acabados antes de que tu pedido salga de bodega.',
  'quality.item3_title': 'Importación directa',
  'quality.item3_body': 'Trabajamos con distribuidores autorizados, sin réplicas ni intermediarios sin verificar.',
  'cta.eyebrow': 'Tu próxima pieza te espera',
  'cta.title': '¿Listo para vestir diferente?',
  'cta.body': 'Explora el catálogo completo y paga contra entrega en toda Colombia. Sin adelantos, sin riesgos.',
  'cta.button_text': 'Ver catálogo',
  'cta.button_href': '/productos',
  'home.faq_title': 'Preguntas frecuentes',
  'pdp.faq_title': 'Preguntas frecuentes',
  'pdp.reviews_title': 'Lo que dicen nuestros clientes',
  'home.sections': JSON.stringify([
    { id: 'hero', visible: true },
    { id: 'spotlight', visible: true },
    { id: 'products', visible: true },
    { id: 'promos', visible: true },
    { id: 'brands', visible: true },
    { id: 'trust', visible: true },
    { id: 'howwork', visible: true },
    { id: 'quality', visible: true },
    { id: 'shipping', visible: true },
    { id: 'faq', visible: true },
    { id: 'newsletter', visible: true },
    { id: 'cta', visible: true },
  ]),
} as const;

export const HOME_SECTIONS = [
  { id: 'hero', label: 'Portada (Hero)' },
  { id: 'spotlight', label: 'Sección editorial' },
  { id: 'products', label: 'Catálogo destacado' },
  { id: 'promos', label: 'Promociones' },
  { id: 'brands', label: 'Compra por marca' },
  { id: 'trust', label: 'Sección de confianza' },
  { id: 'howwork', label: 'Cómo trabajamos' },
  { id: 'quality', label: 'Materiales y calidad' },
  { id: 'shipping', label: 'Envíos seguros' },
  { id: 'faq', label: 'Preguntas frecuentes' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'cta', label: 'CTA final' },
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

export type FaqItem = { question: string; answer: string };
export function getFaqItems(content: SiteContent): FaqItem[] {
  try {
    const parsed = JSON.parse(content['faq.items']);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FaqItem =>
        item && typeof item.question === 'string' && typeof item.answer === 'string' && item.question.trim() !== ''
    );
  } catch {
    return [];
  }
}

export type BrandItem = { name: string; logoUrl: string };
export function getBrandItems(content: SiteContent): BrandItem[] {
  try {
    const parsed = JSON.parse(content['brands.items']);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is BrandItem => item && typeof item.name === 'string' && item.name.trim() !== ''
    );
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
  { key: 'footer.copyright_year', label: 'Año del copyright', section: 'Pie de página' },
  { key: 'social.instagram_url', label: 'Instagram (URL, opcional)', section: 'Pie de página' },
  { key: 'social.tiktok_url', label: 'TikTok (URL, opcional)', section: 'Pie de página' },
  { key: 'social.facebook_url', label: 'Facebook (URL, opcional)', section: 'Pie de página' },
  { key: 'social.x_url', label: 'X / Twitter (URL, opcional)', section: 'Pie de página' },
  { key: 'howwork.eyebrow', label: 'Texto superior', section: 'Cómo trabajamos' },
  { key: 'howwork.title', label: 'Título', section: 'Cómo trabajamos' },
  { key: 'howwork.step1_title', label: 'Paso 1 — título', section: 'Cómo trabajamos' },
  { key: 'howwork.step1_body', label: 'Paso 1 — texto', section: 'Cómo trabajamos', multiline: true },
  { key: 'howwork.step2_title', label: 'Paso 2 — título', section: 'Cómo trabajamos' },
  { key: 'howwork.step2_body', label: 'Paso 2 — texto', section: 'Cómo trabajamos', multiline: true },
  { key: 'howwork.step3_title', label: 'Paso 3 — título', section: 'Cómo trabajamos' },
  { key: 'howwork.step3_body', label: 'Paso 3 — texto', section: 'Cómo trabajamos', multiline: true },
  { key: 'howwork.step4_title', label: 'Paso 4 — título', section: 'Cómo trabajamos' },
  { key: 'howwork.step4_body', label: 'Paso 4 — texto', section: 'Cómo trabajamos', multiline: true },
  { key: 'shipping.eyebrow', label: 'Texto superior', section: 'Envíos seguros' },
  { key: 'shipping.title', label: 'Título', section: 'Envíos seguros' },
  { key: 'shipping.body', label: 'Texto introductorio', section: 'Envíos seguros', multiline: true },
  { key: 'shipping.item1_title', label: 'Punto 1 — título', section: 'Envíos seguros' },
  { key: 'shipping.item1_body', label: 'Punto 1 — texto', section: 'Envíos seguros', multiline: true },
  { key: 'shipping.item2_title', label: 'Punto 2 — título', section: 'Envíos seguros' },
  { key: 'shipping.item2_body', label: 'Punto 2 — texto', section: 'Envíos seguros', multiline: true },
  { key: 'shipping.item3_title', label: 'Punto 3 — título', section: 'Envíos seguros' },
  { key: 'shipping.item3_body', label: 'Punto 3 — texto', section: 'Envíos seguros', multiline: true },
  { key: 'quality.eyebrow', label: 'Texto superior', section: 'Materiales y calidad' },
  { key: 'quality.title', label: 'Título', section: 'Materiales y calidad' },
  { key: 'quality.body', label: 'Texto introductorio', section: 'Materiales y calidad', multiline: true },
  { key: 'quality.item1_title', label: 'Punto 1 — título', section: 'Materiales y calidad' },
  { key: 'quality.item1_body', label: 'Punto 1 — texto', section: 'Materiales y calidad', multiline: true },
  { key: 'quality.item2_title', label: 'Punto 2 — título', section: 'Materiales y calidad' },
  { key: 'quality.item2_body', label: 'Punto 2 — texto', section: 'Materiales y calidad', multiline: true },
  { key: 'quality.item3_title', label: 'Punto 3 — título', section: 'Materiales y calidad' },
  { key: 'quality.item3_body', label: 'Punto 3 — texto', section: 'Materiales y calidad', multiline: true },
  { key: 'cta.eyebrow', label: 'Texto superior', section: 'CTA final' },
  { key: 'cta.title', label: 'Título', section: 'CTA final' },
  { key: 'cta.body', label: 'Texto', section: 'CTA final', multiline: true },
  { key: 'cta.button_text', label: 'Texto del botón', section: 'CTA final' },
  { key: 'cta.button_href', label: 'Enlace del botón', section: 'CTA final' },
  { key: 'home.faq_title', label: 'Título de FAQ en inicio', section: 'Preguntas frecuentes' },
  { key: 'pdp.faq_title', label: 'Título de FAQ en producto', section: 'Preguntas frecuentes' },
  { key: 'pdp.reviews_title', label: 'Título de reseñas en producto', section: 'Preguntas frecuentes' },
];

export async function getSiteContent(): Promise<SiteContent> {
  const rows = await prisma.siteContent.findMany();
  const overrides = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...CONTENT_DEFAULTS, ...overrides } as SiteContent;
}

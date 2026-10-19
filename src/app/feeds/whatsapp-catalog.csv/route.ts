import { prisma } from '@/lib/prisma';
import { getSiteContent } from '@/lib/content';
import { parseColorImages } from '@/lib/colors';
import { sortByAdminOrder } from '@/lib/productOrder';
import { variantKey } from '@/lib/variants';

// Product feed in Meta's catalog format. Commerce Manager reads this URL
// on a schedule and keeps the WhatsApp Business (and Facebook/Instagram)
// catalog in sync with the store: new products, prices, photos and
// sold-out state, with nothing to upload by hand.
//
// One item per product and color, like the store's own cards; sizes go in
// the description since a WhatsApp catalog item has no size picker.

export const revalidate = 900;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wearafra.com').replace(/\/$/, '');

const COLUMNS = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'sale_price',
  'link',
  'image_link',
  'additional_image_link',
  'brand',
  'item_group_id',
  'color',
  'product_type',
  'google_product_category',
] as const;

type Row = Record<(typeof COLUMNS)[number], string>;

const absolute = (url: string) => (/^https?:\/\//.test(url) ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`);
const money = (cents: number) => `${Math.round(cents / 100)} COP`;
const csvCell = (value: string) => `"${value.replace(/[\r\n]+/g, ' ').replace(/"/g, '""')}"`;
const plain = (text: string) =>
  text
    .replace(/^[\s]*[•\-*]\s*/gm, '')
    .replace(/[*_#>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const sentence = (text: string) => (text && !/[.!?]$/.test(text) ? `${text}.` : text);

export async function GET() {
  const [products, content] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, include: { variants: true } }),
    getSiteContent(),
  ]);
  const ordered = sortByAdminOrder(products, content['catalog.product_order']);

  const rows: Row[] = [];
  for (const product of ordered) {
    const colorImages = parseColorImages(product.colorImages);
    const colors: (string | null)[] = product.colors.length > 0 ? product.colors : [null];
    const onSale = product.compareAtPriceCents != null && product.compareAtPriceCents > product.priceCents;

    for (const color of colors) {
      const images = ((color && colorImages[color]?.length ? colorImages[color] : product.images) ?? []).filter(Boolean);
      if (images.length === 0) continue; // Meta rejects items without a photo.

      const variants = product.variants.filter((v) => color === null || (v.color ?? null) === color);
      const inStockSizes = product.sizes.filter((size) =>
        product.variants.length === 0
          ? product.stock > 0
          : (product.variants.find((v) => variantKey(v.size, v.color) === variantKey(size, color))?.stock ?? 0) > 0
      );
      const stock = product.variants.length === 0 ? product.stock : variants.reduce((sum, v) => sum + v.stock, 0);

      const description = [
        sentence(plain(product.description)),
        inStockSizes.length ? `Tallas disponibles: ${inStockSizes.join(', ')}.` : '',
        product.materials ? sentence(`Material: ${plain(product.materials)}`) : '',
      ]
        .filter(Boolean)
        .join(' ')
        .slice(0, 4900);

      const link = `${SITE_URL}/productos/${product.slug}${color && product.colors.length > 1 ? `?color=${encodeURIComponent(color)}` : ''}`;

      rows.push({
        id: color ? `${product.id}-${color.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : product.id,
        title: `${product.brand} ${product.name}${color && product.colors.length > 1 ? ` - ${color}` : ''}`.slice(0, 150),
        description: description || `${product.brand} ${product.name}`,
        availability: stock > 0 ? 'in stock' : 'out of stock',
        condition: 'new',
        price: money(onSale ? product.compareAtPriceCents! : product.priceCents),
        sale_price: onSale ? money(product.priceCents) : '',
        link,
        image_link: absolute(images[0]),
        additional_image_link: images.slice(1, 10).map(absolute).join(','),
        brand: product.brand,
        item_group_id: product.colors.length > 1 ? product.id : '',
        color: color ?? '',
        product_type: product.category ?? '',
        google_product_category: 'Apparel & Accessories > Clothing',
      });
    }
  }

  const csv = [COLUMNS.join(','), ...rows.map((row) => COLUMNS.map((c) => csvCell(row[c])).join(','))].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  });
}

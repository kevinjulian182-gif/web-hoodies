import { getCatalogItems, feedPrice } from '@/lib/catalogFeed';

// Product feed in Meta's catalog format. Commerce Manager reads this URL
// on a schedule and keeps the WhatsApp Business (and Facebook/Instagram)
// catalog in sync with the store: new products, prices, photos and
// sold-out state, with nothing to upload by hand.

export const revalidate = 900;

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

const csvCell = (value: string) => `"${value.replace(/[\r\n]+/g, ' ').replace(/"/g, '""')}"`;

export async function GET() {
  const rows = (await getCatalogItems()).map((item): Record<(typeof COLUMNS)[number], string> => ({
    id: item.id,
    title: item.title,
    description: item.description,
    availability: item.inStock ? 'in stock' : 'out of stock',
    condition: 'new',
    price: feedPrice(item.priceCents),
    sale_price: item.salePriceCents ? feedPrice(item.salePriceCents) : '',
    link: item.link,
    image_link: item.image,
    additional_image_link: item.additionalImages.join(','),
    brand: item.brand,
    item_group_id: item.groupId ?? '',
    color: item.color ?? '',
    product_type: item.productType ?? '',
    google_product_category: 'Apparel & Accessories > Clothing',
  }));

  const csv = [COLUMNS.join(','), ...rows.map((row) => COLUMNS.map((c) => csvCell(row[c])).join(','))].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  });
}

import { getCatalogItems, feedPrice } from '@/lib/catalogFeed';
import { SITE_URL } from '@/lib/seo';

// Google Merchant Center product feed (RSS 2.0 + g: namespace). Scheduled
// in Merchant Center, it powers free listings in Google Shopping and
// Shopping / Performance Max ads, always in sync with the store.

export const revalidate = 900;

const xml = (value: string) =>
  value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

export async function GET() {
  const items = await getCatalogItems();
  const entries = items
    .map((item) =>
      [
        '<item>',
        `<g:id>${xml(item.id)}</g:id>`,
        `<g:title>${xml(item.title)}</g:title>`,
        `<g:description>${xml(item.description)}</g:description>`,
        `<g:link>${xml(item.link)}</g:link>`,
        `<g:image_link>${xml(item.image)}</g:image_link>`,
        ...item.additionalImages.map((url) => `<g:additional_image_link>${xml(url)}</g:additional_image_link>`),
        `<g:availability>${item.inStock ? 'in_stock' : 'out_of_stock'}</g:availability>`,
        `<g:price>${feedPrice(item.priceCents)}</g:price>`,
        item.salePriceCents ? `<g:sale_price>${feedPrice(item.salePriceCents)}</g:sale_price>` : '',
        '<g:condition>new</g:condition>',
        `<g:brand>${xml(item.brand)}</g:brand>`,
        '<g:identifier_exists>no</g:identifier_exists>',
        '<g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>',
        item.productType ? `<g:product_type>${xml(item.productType)}</g:product_type>` : '',
        item.groupId ? `<g:item_group_id>${xml(item.groupId)}</g:item_group_id>` : '',
        item.color ? `<g:color>${xml(item.color)}</g:color>` : '',
        '</item>',
      ]
        .filter(Boolean)
        .join('')
    )
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>AFRA</title>
<link>${SITE_URL}</link>
<description>Streetwear de marca en Colombia</description>
${entries}
</channel>
</rss>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  });
}

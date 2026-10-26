import { prisma } from '@/lib/prisma';
import { getSiteContent } from '@/lib/content';
import { parseColorImages } from '@/lib/colors';
import { sortByAdminOrder } from '@/lib/productOrder';
import { variantKey } from '@/lib/variants';
import { catalogItemId } from '@/lib/metaPixel';
import { SITE_URL, jpgImage } from '@/lib/seo';

// One catalog item per product and color (like the store's own cards),
// shared by the Meta/WhatsApp CSV feed and the Google Merchant XML feed so
// both show exactly the same products, prices, photos and stock. Ids match
// the pixel's content_ids (catalogItemId).

export type CatalogItem = {
  id: string;
  title: string;
  description: string;
  inStock: boolean;
  priceCents: number;
  salePriceCents: number | null;
  link: string;
  image: string;
  additionalImages: string[];
  brand: string;
  groupId: string | null;
  color: string | null;
  sizes: string[];
  /** Units per size for this color (aggregate stock when there are no variants). */
  stockBySize: Record<string, number>;
  /** False when the product only tracks one total stock shared by all sizes. */
  stockPerSize: boolean;
  productType: string | null;
};

const plain = (text: string) =>
  text
    .replace(/^[\s]*[•\-*]\s*/gm, '')
    .replace(/[*_#>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const sentence = (text: string) => (text && !/[.!?]$/.test(text) ? `${text}.` : text);

export async function getCatalogItems(): Promise<CatalogItem[]> {
  const [products, content] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, include: { variants: true } }),
    getSiteContent(),
  ]);
  const items: CatalogItem[] = [];

  for (const product of sortByAdminOrder(products, content['catalog.product_order'])) {
    const colorImages = parseColorImages(product.colorImages);
    const colors: (string | null)[] = product.colors.length > 0 ? product.colors : [null];
    const onSale = product.compareAtPriceCents != null && product.compareAtPriceCents > product.priceCents;

    for (const color of colors) {
      const images = ((color && colorImages[color]?.length ? colorImages[color] : product.images) ?? []).filter(Boolean);
      if (images.length === 0) continue; // catalogs reject items without a photo

      const variants = product.variants.filter((v) => color === null || (v.color ?? null) === color);
      const stockBySize = Object.fromEntries(
        product.sizes.map((size) => [
          size,
          product.variants.length === 0
            ? product.stock
            : product.variants.find((v) => variantKey(v.size, v.color) === variantKey(size, color))?.stock ?? 0,
        ])
      );
      const inStockSizes = product.sizes.filter((size) => stockBySize[size] > 0);
      const stock = product.variants.length === 0 ? product.stock : variants.reduce((sum, v) => sum + v.stock, 0);
      const multiColor = Boolean(color && product.colors.length > 1);

      const description = [
        sentence(plain(product.description)),
        inStockSizes.length ? `Tallas disponibles: ${inStockSizes.join(', ')}.` : '',
        product.materials ? sentence(`Material: ${plain(product.materials)}`) : '',
      ]
        .filter(Boolean)
        .join(' ')
        .slice(0, 4900);

      items.push({
        id: catalogItemId(product.id, color),
        title: `${product.brand} ${product.name}${multiColor ? ` - ${color}` : ''}`.slice(0, 150),
        description: description || `${product.brand} ${product.name}`,
        inStock: stock > 0,
        priceCents: onSale ? product.compareAtPriceCents! : product.priceCents,
        salePriceCents: onSale ? product.priceCents : null,
        link: `${SITE_URL}/productos/${product.slug}${multiColor ? `?color=${encodeURIComponent(color!)}` : ''}`,
        // Meta and Google want JPG/PNG; store uploads are WebP.
        image: jpgImage(images[0]),
        additionalImages: images.slice(1, 10).map(jpgImage),
        brand: product.brand,
        groupId: product.colors.length > 1 ? product.id : null,
        color,
        sizes: inStockSizes,
        stockBySize,
        stockPerSize: product.variants.length > 0,
        productType: product.category,
      });
    }
  }
  return items;
}

export const feedPrice = (cents: number) => `${Math.round(cents / 100)} COP`;

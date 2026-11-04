import { getCatalogItems, type CatalogItem } from '@/lib/catalogFeed';

// Listings for marketplaces that don't read our feeds (Mercado Libre,
// Facebook Marketplace as a person): the copy is written to their rules so
// it can be pasted as is.

export type MarketplaceListing = {
  sku: string;
  title: string;
  description: string;
  pricePesos: number;
  stockBySize: Record<string, number>;
  stockPerSize: boolean;
  color: string | null;
  brand: string;
  category: string | null;
  images: string[];
  link: string;
};

/** Mercado Libre caps titles at 60 characters; cut on a word, never mid-word. */
function fitTitle(text: string, max = 60) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  return cut.slice(0, cut.lastIndexOf(' ')).trim();
}

// Mercado Libre removes listings with links, phone numbers or emails in the
// description, so it only describes the product.
function listingDescription(item: CatalogItem) {
  const lines = [
    item.description.replace(/https?:\/\/\S+/g, '').trim(),
    '',
    `Marca: ${item.brand}`,
    item.color ? `Color: ${item.color}` : '',
    '',
    'Producto nuevo, con etiquetas.',
    'Envío a todo el país.',
  ];
  return lines.filter((l, i, all) => l !== '' || (all[i - 1] ?? '') !== '').join('\n').trim();
}

export async function getMarketplaceListings(): Promise<MarketplaceListing[]> {
  const items = await getCatalogItems();
  return items.map((item) => {
    const name = item.title.replace(new RegExp(`^${item.brand}\\s+`, 'i'), '').replace(/ - [^-]+$/, '');
    return {
      sku: item.id,
      title: fitTitle([item.productType && !name.toLowerCase().includes(item.productType.toLowerCase()) ? item.productType : '', name, item.brand, item.color ?? ''].filter(Boolean).join(' ')),
      description: listingDescription(item),
      pricePesos: Math.round((item.salePriceCents ?? item.priceCents) / 100),
      stockBySize: item.stockBySize,
      stockPerSize: item.stockPerSize,
      color: item.color,
      brand: item.brand,
      category: item.productType,
      images: [item.image, ...item.additionalImages],
      link: item.link,
    };
  });
}

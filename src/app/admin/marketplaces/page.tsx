import type { Metadata } from 'next';
import { getMarketplaceListings } from '@/lib/marketplaces';
import MarketplacesView from './MarketplacesView';

export const metadata: Metadata = { title: 'Mercado Libre y Marketplace' };
export const dynamic = 'force-dynamic';

export default async function MarketplacesPage() {
  return <MarketplacesView listings={await getMarketplaceListings()} />;
}

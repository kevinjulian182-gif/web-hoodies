import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getLegalInfo, getSiteContent } from '@/lib/content';
import VoucherCreator from './VoucherCreator';

export const metadata: Metadata = { title: 'Bouchers de envío' };
export const dynamic = 'force-dynamic';

export default async function BouchersPage() {
  const legal = getLegalInfo(await getSiteContent());
  return (
    <Suspense>
      <VoucherCreator
        sender={{ name: legal.name, nit: legal.nit || undefined, address: legal.address || undefined, phone: legal.phone || undefined }}
      />
    </Suspense>
  );
}

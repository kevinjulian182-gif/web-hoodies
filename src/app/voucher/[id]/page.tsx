import { redirect } from 'next/navigation';

// Old "Generar boucher" links now open the voucher creator with the order loaded.
export default async function VoucherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/bouchers?pedido=${encodeURIComponent(id)}`);
}

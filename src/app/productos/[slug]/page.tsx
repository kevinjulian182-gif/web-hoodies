import Image from 'next/image';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatCOP } from '@/lib/format';
import AddToCartButton from '@/components/AddToCartButton';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product || !product.active) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 grid md:grid-cols-2 gap-16">
      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-cream-100">
        {product.images[0] && (
          <Image src={product.images[0]} alt={product.name} fill className="object-cover" priority />
        )}
      </div>
      <div className="max-w-md">
        <p className="text-xs uppercase tracking-wide text-coffee-600">{product.brand}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tightest text-coffee-900">{product.name}</h1>
        <p className="mt-4 text-xl font-medium text-coffee-800">{formatCOP(product.priceCents)}</p>
        <p className="mt-6 text-coffee-700 leading-relaxed">{product.description}</p>
        <div className="mt-10">
          <AddToCartButton product={product} />
        </div>
      </div>
    </div>
  );
}

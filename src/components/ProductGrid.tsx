import ProductCard from '@/components/ProductCard';
import type { Product } from '@prisma/client';

export default function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="text-center text-coffee-600 py-24">Pronto nuevas piezas.</p>;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} index={i} />
      ))}
    </div>
  );
}

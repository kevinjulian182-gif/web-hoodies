'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWishlist } from '@/lib/wishlist';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@prisma/client';

export default function FavoritesPage() {
  const { ids } = useWishlist();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const favorites = (products ?? []).filter((p) => ids.includes(p.id));

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tightest text-coffee-900">Favoritos</h1>
      <p className="mt-3 text-coffee-600">Las piezas que estás siguiendo de cerca.</p>

      {products === null ? (
        <p className="mt-16 text-coffee-500">Cargando…</p>
      ) : favorites.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-coffee-600">Aún no tienes favoritos guardados.</p>
          <Link
            href="/productos"
            className="mt-6 inline-block rounded-full bg-coffee-900 px-6 py-3 text-sm font-medium text-cream-50 hover:bg-coffee-800 transition-colors"
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
          {favorites.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

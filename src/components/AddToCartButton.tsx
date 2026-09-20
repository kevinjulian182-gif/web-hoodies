'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/lib/cart';
import type { Product } from '@prisma/client';

export default function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [size, setSize] = useState(product.sizes[0] ?? '');
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: product.images[0] ?? '',
      size,
      priceCents: product.priceCents,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {product.sizes.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`h-11 w-11 rounded-full text-sm font-medium border transition-colors ${
              size === s
                ? 'bg-coffee-900 text-cream-50 border-coffee-900'
                : 'border-cream-200 text-coffee-700 hover:border-coffee-600'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <motion.button
        onClick={handleAdd}
        whileTap={{ scale: 0.96 }}
        className="relative w-full bg-coffee-900 text-cream-50 py-4 rounded-full text-sm font-medium tracking-wide overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {added ? (
            <motion.span
              key="added"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="block"
            >
              Agregado ✓
            </motion.span>
          ) : (
            <motion.span
              key="add"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="block"
            >
              Agregar al carrito
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

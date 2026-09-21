'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/lib/cart';
import { colorToHex } from '@/lib/colors';
import type { Product } from '@prisma/client';

const LOW_STOCK_THRESHOLD = 5;

export default function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [size, setSize] = useState(product.sizes[0] ?? '');
  const [color, setColor] = useState(product.colors[0] ?? '');
  const [added, setAdded] = useState(false);

  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= LOW_STOCK_THRESHOLD;

  const handleAdd = () => {
    if (outOfStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: product.images[0] ?? '',
      size,
      color: color || undefined,
      priceCents: product.priceCents,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div>
      {product.colors.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-xs uppercase tracking-wide text-coffee-500">
            Color{color && `: ${color}`}
          </p>
          <div className="flex gap-2">
            {product.colors.map((c) => (
              <button
                key={c}
                aria-label={c}
                title={c}
                onClick={() => setColor(c)}
                className={`h-9 w-9 rounded-full border-2 transition-all ${
                  color === c ? 'border-coffee-900 scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ boxShadow: `0 0 0 1px ${color === c ? 'transparent' : '#e7ddd0'} inset` }}
              >
                <span
                  className="block h-full w-full rounded-full"
                  style={{ backgroundColor: colorToHex(c) }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-2 text-xs uppercase tracking-wide text-coffee-500">Talla</div>
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

      {lowStock && (
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-red-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
          </span>
          ¡Solo quedan {product.stock} unidades!
        </p>
      )}

      <motion.button
        onClick={handleAdd}
        disabled={outOfStock}
        whileTap={outOfStock ? undefined : { scale: 0.96 }}
        className={`relative w-full overflow-hidden rounded-full py-5 text-base font-semibold tracking-[0.04em] shadow-[0_10px_30px_rgba(54,37,25,0.25)] transition-opacity ${
          outOfStock ? 'cursor-not-allowed bg-coffee-300 text-coffee-50 shadow-none' : 'bg-coffee-900 text-cream-50'
        }`}
      >
        <AnimatePresence mode="wait">
          {outOfStock ? (
            <motion.span key="oos" className="block">
              Agotado
            </motion.span>
          ) : added ? (
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

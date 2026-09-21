'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart, type CartItem } from '@/lib/cart';
import { formatCOP } from '@/lib/format';

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, subtotalCents } = useCart();
  const pathname = usePathname();

  // Never show the drawer over the distraction-free checkout itself.
  useEffect(() => {
    if (pathname.startsWith('/checkout') && isOpen) closeCart();
  }, [pathname, isOpen, closeCart]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeCart]);

  if (pathname.startsWith('/checkout')) return null;

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeCart}
            className="fixed inset-0 z-[60] bg-coffee-900/30 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Carrito de compras"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-md flex-col bg-cream-50 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-cream-200 px-6 h-16 shrink-0">
              <h2 className="text-base font-semibold tracking-tightest text-coffee-900">
                Tu carrito {itemCount > 0 && `(${itemCount})`}
              </h2>
              <button
                aria-label="Cerrar carrito"
                onClick={closeCart}
                className="flex h-9 w-9 items-center justify-center rounded-full text-coffee-700 hover:bg-cream-100 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-coffee-400">
                  <BagIcon size={28} />
                </div>
                <div>
                  <p className="font-medium text-coffee-900">Tu carrito está vacío</p>
                  <p className="mt-1 text-sm text-coffee-600">Explora la colección y encuentra tu próxima pieza.</p>
                </div>
                <Link
                  href="/productos"
                  onClick={closeCart}
                  className="mt-2 inline-block rounded-full bg-coffee-900 px-6 py-3 text-sm font-medium text-cream-50 hover:bg-coffee-800 transition-colors"
                >
                  Ver catálogo
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <CartRow
                        key={`${item.productId}-${item.size}-${item.color ?? ''}`}
                        item={item}
                        onUpdateQuantity={(qty) => updateQuantity(item.productId, item.size, qty, item.color)}
                        onRemove={() => removeItem(item.productId, item.size, item.color)}
                      />
                    ))}
                  </AnimatePresence>
                </ul>

                <div className="shrink-0 border-t border-cream-200 px-6 py-5">
                  <div className="mb-4 flex items-baseline justify-between text-sm">
                    <span className="text-coffee-600">Subtotal</span>
                    <span className="text-lg font-semibold text-coffee-900">{formatCOP(subtotalCents)}</span>
                  </div>
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="block w-full rounded-full bg-coffee-900 py-4 text-center text-sm font-medium tracking-wide text-cream-50 hover:bg-coffee-800 transition-colors"
                  >
                    Continuar al pago
                  </Link>
                  <p className="mt-3 text-center text-xs text-coffee-500">Envío y descuentos se calculan en el pago.</p>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function CartRow({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-4 overflow-hidden py-4 first:pt-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-cream-200"
    >
      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-cream-100">
        {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />}
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-coffee-900">{item.name}</p>
            <p className="text-xs text-coffee-500">
              Talla {item.size}
              {item.color && ` · ${item.color}`}
            </p>
          </div>
          <button
            aria-label={`Quitar ${item.name} del carrito`}
            onClick={onRemove}
            className="shrink-0 text-coffee-400 hover:text-coffee-800 transition-colors"
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 rounded-full border border-cream-200">
            <button
              aria-label="Reducir cantidad"
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-coffee-700 transition-colors hover:bg-cream-100 hover:text-coffee-900"
            >
              −
            </button>
            <span className="min-w-[1ch] text-sm text-coffee-900">{item.quantity}</span>
            <button
              aria-label="Aumentar cantidad"
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-coffee-700 transition-colors hover:bg-cream-100 hover:text-coffee-900"
            >
              +
            </button>
          </div>
          <span className="text-sm font-semibold text-coffee-900">
            {formatCOP(item.priceCents * item.quantity)}
          </span>
        </div>
      </div>
    </motion.li>
  );
}

function BagIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 8h12l-1 12H7L6 8Z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

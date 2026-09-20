'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  image: string;
  size: string;
  priceCents: number;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size: string) => void;
  clear: () => void;
  subtotalCents: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'hoodies-cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // A single mount-time read, with no companion "write on every items change"
  // effect: that pairing races on mount (the write effect fires with the
  // still-empty initial state before the read's setItems is applied),
  // wiping out whatever was just persisted on the previous page.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      // ignore malformed/inaccessible storage
    }
  }, []);

  const persist = (next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage write failures (e.g. private browsing)
    }
  };

  const addItem = (item: CartItem) => {
    const existing = items.find((i) => i.productId === item.productId && i.size === item.size);
    const next = existing
      ? items.map((i) => (i === existing ? { ...i, quantity: i.quantity + item.quantity } : i))
      : [...items, item];
    persist(next);
  };

  const removeItem = (productId: string, size: string) => {
    persist(items.filter((i) => !(i.productId === productId && i.size === size)));
  };

  const clear = () => persist([]);

  const subtotalCents = useMemo(
    () => items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clear, subtotalCents }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}

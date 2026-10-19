'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  image: string;
  size: string;
  color?: string;
  priceCents: number;
  quantity: number;
  /** Units in stock for this size+color the last time it was checked;
   * unknown (undefined) until the first check. 0 means sold out. */
  maxQuantity?: number;
};

export type AddResult = { ok: boolean; available: number };

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem, options?: { openDrawer?: boolean }) => Promise<AddResult>;
  removeItem: (productId: string, size: string, color?: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number, color?: string) => void;
  clear: () => void;
  subtotalCents: number;
  /** Some line has no stock left and must be removed before paying. */
  hasSoldOut: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'hoodies-cart';

function sameLine(a: CartItem, productId: string, size: string, color?: string) {
  return a.productId === productId && a.size === size && (a.color ?? '') === (color ?? '');
}

/** Live stock for each line, or null when the check can't be made (offline):
 * the cart then keeps working and checkout still enforces stock. */
async function fetchStock(lines: Pick<CartItem, 'productId' | 'size' | 'color'>[]): Promise<number[] | null> {
  if (lines.length === 0) return [];
  try {
    const res = await fetch('/api/cart/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: lines.map(({ productId, size, color }) => ({ productId, size, color })) }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()).stocks as number[];
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  // Latest items for async callbacks (stock checks resolve after renders).
  const itemsRef = useRef<CartItem[]>([]);

  const persist = useCallback((next: CartItem[]) => {
    itemsRef.current = next;
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage write failures (e.g. private browsing)
    }
  }, []);

  /** Re-reads stock for every line and trims quantities that no longer fit. */
  const refreshStock = useCallback(async () => {
    const snapshot = itemsRef.current;
    const stocks = await fetchStock(snapshot);
    if (!stocks) return;
    const byKey = new Map(snapshot.map((item, i) => [`${item.productId}|${item.size}|${item.color ?? ''}`, stocks[i]]));
    const next = itemsRef.current.map((item) => {
      const stock = byKey.get(`${item.productId}|${item.size}|${item.color ?? ''}`);
      if (stock === undefined) return item;
      return { ...item, maxQuantity: stock, quantity: stock > 0 ? Math.min(item.quantity, stock) : item.quantity };
    });
    persist(next);
  }, [persist]);

  // A single mount-time read, with no companion "write on every items change"
  // effect: that pairing races on mount (the write effect fires with the
  // still-empty initial state before the read's setItems is applied),
  // wiping out whatever was just persisted on the previous page.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        itemsRef.current = parsed;
        setItems(parsed);
        refreshStock();
      }
    } catch {
      // ignore malformed/inaccessible storage
    }
  }, [refreshStock]);

  // Stock moves while the cart sits there; re-check each time it's opened.
  useEffect(() => {
    if (isOpen) refreshStock();
  }, [isOpen, refreshStock]);

  const addItem = async (item: CartItem, options?: { openDrawer?: boolean }): Promise<AddResult> => {
    const [stock] = (await fetchStock([item])) ?? [item.maxQuantity];
    const current = itemsRef.current;
    const existing = current.find((i) => sameLine(i, item.productId, item.size, item.color));
    const inCart = existing?.quantity ?? 0;
    const available = stock ?? Infinity;
    if (inCart + item.quantity > available) {
      // Fill up to what's left, or refuse if there's nothing left to add.
      const room = Math.max(0, available - inCart);
      if (room === 0) {
        if (existing && stock !== undefined) {
          persist(current.map((i) => (i === existing ? { ...i, maxQuantity: stock } : i)));
        }
        return { ok: false, available: stock ?? 0 };
      }
      item = { ...item, quantity: room };
    }
    const maxQuantity = stock ?? undefined;
    const next = existing
      ? current.map((i) => (i === existing ? { ...i, quantity: i.quantity + item.quantity, maxQuantity } : i))
      : [...current, { ...item, maxQuantity }];
    persist(next);
    // Only the first add (empty cart) pops the drawer open, to show where
    // the cart lives; later adds just confirm on the button and bump the
    // badge instead of interrupting browsing every time.
    if (options?.openDrawer !== false && current.length === 0) setIsOpen(true);
    return { ok: true, available: stock ?? Infinity };
  };

  const removeItem = (productId: string, size: string, color?: string) => {
    persist(itemsRef.current.filter((i) => !sameLine(i, productId, size, color)));
  };

  const updateQuantity = (productId: string, size: string, quantity: number, color?: string) => {
    if (quantity < 1) {
      removeItem(productId, size, color);
      return;
    }
    persist(
      itemsRef.current.map((i) =>
        sameLine(i, productId, size, color)
          ? { ...i, quantity: i.maxQuantity !== undefined ? Math.min(quantity, Math.max(i.maxQuantity, 1)) : quantity }
          : i
      )
    );
  };

  const clear = () => persist([]);

  const subtotalCents = useMemo(
    () => items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
    [items]
  );
  const hasSoldOut = items.some((i) => i.maxQuantity === 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clear,
        subtotalCents,
        hasSoldOut,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}

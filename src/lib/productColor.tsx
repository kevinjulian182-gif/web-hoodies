'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type ProductColorContextValue = {
  selectedColor: string;
  setSelectedColor: (color: string) => void;
};

const ProductColorContext = createContext<ProductColorContextValue | null>(null);

// Scoped to one product-detail page (instantiated fresh in productos/[slug]),
// not the root layout — it's how the gallery and the color swatches in
// AddToCartButton, which sit in different branches of the page, agree on
// which color is selected without threading props between them.
export function ProductColorProvider({
  defaultColor,
  validColors,
  children,
}: {
  defaultColor: string;
  // When a catalog card for one color is clicked, it links here with
  // ?color=<name> so the PDP opens already on that colorway instead of
  // defaulting to the first one — read client-side only (not via
  // searchParams/useSearchParams) so the page keeps rendering statically.
  validColors?: string[];
  children: ReactNode;
}) {
  const [selectedColor, setSelectedColor] = useState(defaultColor);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('color');
    if (fromUrl && (!validColors || validColors.includes(fromUrl))) {
      setSelectedColor(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ProductColorContext.Provider value={{ selectedColor, setSelectedColor }}>
      {children}
    </ProductColorContext.Provider>
  );
}

export function useProductColor() {
  const ctx = useContext(ProductColorContext);
  if (!ctx) throw new Error('useProductColor debe usarse dentro de ProductColorProvider');
  return ctx;
}

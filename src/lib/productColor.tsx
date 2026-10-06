'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type ProductColorContextValue = {
  selectedColor: string;
  setSelectedColor: (color: string) => void;
};

const ProductColorContext = createContext<ProductColorContextValue | null>(null);

// Scoped to one product-detail page (instantiated fresh in productos/[slug]),
// not the root layout — it's how the gallery and the color swatches in
// AddToCartButton, which sit in different branches of the page, agree on
// which color is selected without threading props between them.
export function ProductColorProvider({ defaultColor, children }: { defaultColor: string; children: ReactNode }) {
  const [selectedColor, setSelectedColor] = useState(defaultColor);
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

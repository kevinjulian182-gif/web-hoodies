'use client';

import { createContext, useContext, type ReactNode } from 'react';

type CatalogSettings = {
  showColors: boolean;
  showSizes: boolean;
  /** 0 = no free-shipping threshold. */
  freeShippingThresholdCents: number;
  /** Flat fee charged under the threshold; 0 = shipping always free. */
  shippingCostCents: number;
};

const CatalogSettingsContext = createContext<CatalogSettings>({
  showColors: true,
  showSizes: true,
  freeShippingThresholdCents: 0,
  shippingCostCents: 0,
});

export function CatalogSettingsProvider({ children, ...settings }: CatalogSettings & { children: ReactNode }) {
  return <CatalogSettingsContext.Provider value={settings}>{children}</CatalogSettingsContext.Provider>;
}

export function useCatalogSettings() {
  return useContext(CatalogSettingsContext);
}

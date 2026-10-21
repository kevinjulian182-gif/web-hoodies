'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ShippingRates } from '@/lib/pricing';

type CatalogSettings = {
  showColors: boolean;
  showSizes: boolean;
  /** 0 = no free-shipping threshold. */
  freeShippingThresholdCents: number;
  /** Carrier rates by destination zone, charged under the threshold. */
  shippingRates: ShippingRates;
};

const CatalogSettingsContext = createContext<CatalogSettings>({
  showColors: true,
  showSizes: true,
  freeShippingThresholdCents: 0,
  shippingRates: {
    localCents: 0,
    regionalCents: 0,
    nationalCents: 0,
    specialCents: 0,
    localDepartments: [],
    regionalDepartments: [],
    specialDepartments: [],
  },
});

export function CatalogSettingsProvider({ children, ...settings }: CatalogSettings & { children: ReactNode }) {
  return <CatalogSettingsContext.Provider value={settings}>{children}</CatalogSettingsContext.Provider>;
}

export function useCatalogSettings() {
  return useContext(CatalogSettingsContext);
}

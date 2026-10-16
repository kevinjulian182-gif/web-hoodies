'use client';

import { createContext, useContext, type ReactNode } from 'react';

type CatalogSettings = { showColors: boolean; showSizes: boolean };

const CatalogSettingsContext = createContext<CatalogSettings>({ showColors: true, showSizes: true });

export function CatalogSettingsProvider({
  showColors,
  showSizes,
  children,
}: CatalogSettings & { children: ReactNode }) {
  return (
    <CatalogSettingsContext.Provider value={{ showColors, showSizes }}>{children}</CatalogSettingsContext.Provider>
  );
}

export function useCatalogSettings() {
  return useContext(CatalogSettingsContext);
}

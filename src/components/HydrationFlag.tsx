'use client';

import { useEffect } from 'react';

// Marks <html> once React has hydrated. Until then, globals.css force-reveals
// any element Framer server-rendered at opacity 0, so slow devices (or
// browsers where the JS bundle fails) never sit on a blank page.
export default function HydrationFlag() {
  useEffect(() => {
    document.documentElement.setAttribute('data-hydrated', '');
  }, []);
  return null;
}

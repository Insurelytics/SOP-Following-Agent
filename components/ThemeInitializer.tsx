'use client';

import { useEffect } from 'react';
import { applyTheme, getSavedTheme } from '@/lib/theme';

/**
 * ThemeInitializer component
 * Applies the saved theme on initial load
 * This runs on the client side to read localStorage
 */
export default function ThemeInitializer() {
  useEffect(() => {
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);
  }, []);

  return null;
}


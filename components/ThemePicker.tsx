'use client';

import { useState, useEffect } from 'react';
import { THEMES, ThemeName, applyTheme, getSavedTheme } from '@/lib/theme';

export default function ThemePicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('dark');

  // Load saved theme on mount
  useEffect(() => {
    const saved = getSavedTheme();
    setCurrentTheme(saved);
    applyTheme(saved);
  }, []);

  const handleThemeChange = (themeName: ThemeName) => {
    setCurrentTheme(themeName);
    applyTheme(themeName);
    setIsOpen(false);
  };

  const currentThemeLabel = currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-foreground-muted hover:text-foreground-muted-hover transition-colors w-full text-center"
      >
        Signed in as <span className="text-foreground font-medium">dev-test</span>
        <div className="text-xs text-foreground-muted mt-1">Theme: {currentThemeLabel}</div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-background-tertiary border border-border rounded-lg shadow-lg z-50">
          <div className="py-2">
            {Object.values(THEMES).map((theme) => (
              <button
                key={theme.name}
                onClick={() => handleThemeChange(theme.name)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  currentTheme === theme.name
                    ? 'bg-action text-white'
                    : 'text-foreground-muted hover:bg-background-secondary'
                }`}
              >
                {theme.name.charAt(0).toUpperCase() + theme.name.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


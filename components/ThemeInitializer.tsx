'use client';

import { useEffect, useState } from 'react';
import { applyTheme, getSavedTheme } from '@/lib/theme';

/**
 * ThemeInitializer component
 * - Applies the saved theme on initial load
 * - Shows a one-time beta warning modal for first-time visitors
 */
export default function ThemeInitializer() {
  const [showBetaNotice, setShowBetaNotice] = useState(false);

  useEffect(() => {
    // Apply saved theme
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);

    // Show beta notice only on first visit (per browser)
    if (typeof window !== 'undefined') {
      const hasSeenNotice = localStorage.getItem('sop-beta-notice-dismissed');
      if (!hasSeenNotice) {
        setShowBetaNotice(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sop-beta-notice-dismissed', 'true');
    }
    setShowBetaNotice(false);
  };

  if (!showBetaNotice) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="max-w-lg w-full mx-4 rounded-2xl bg-background-secondary border border-border shadow-2xl">
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Beta
            </span>
            <h2 className="text-lg font-semibold text-foreground">
              You&apos;re using a beta version
            </h2>
          </div>
          <p className="text-sm text-foreground-muted mb-3">
            This is an early preview of the SOP Following Agent. You may
            encounter bugs, rough edges, or unfinished features while we work to improve the experience.
          </p>
          <p className="text-xs text-foreground-muted">
            Just a heads up!  Feedback is very welcome.
          </p>
        </div>
        <div className="px-6 pb-5 pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex items-center rounded-lg bg-button-bg px-4 py-2 text-sm font-medium text-white hover:bg-button-hover-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-background transition"
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}



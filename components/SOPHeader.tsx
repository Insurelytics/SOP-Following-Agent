'use client';

import { useState, useEffect } from 'react';
import type { SOP } from '@/lib/types/sop';
import type { SOPRun } from '@/lib/types/sop';

interface SOPData {
  sop: SOP;
  run: SOPRun;
}

interface SOPHeaderProps {
  chatId: number;
}

export default function SOPHeader({ chatId }: SOPHeaderProps) {
  const [sopData, setSOPData] = useState<SOPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSOPData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/chats/${chatId}/sop`);
        const data = await response.json();
        setSOPData(data);
      } catch (err) {
        console.error('Error fetching SOP data:', err);
        setError('Failed to load SOP');
      } finally {
        setLoading(false);
      }
    };

    fetchSOPData();
  }, [chatId]);

  if (loading) {
    return (
      <div className="h-20 border-b border-border bg-background-secondary/30 flex items-center px-6">
        <div className="text-foreground-muted text-sm">Loading SOP...</div>
      </div>
    );
  }

  if (error || !sopData) {
    return null;
  }

  const { sop, run } = sopData;
  const currentStepIndex = sop.steps.findIndex((step) => step.id === run.currentStepId);

  return (
    <div className="border-b border-border bg-background-secondary/30">
      {/* SOP Title */}
      <div className="px-6 py-3 border-b border-border/50">
        <h2 className="text-sm font-semibold text-foreground">
          {sop.displayName}
        </h2>
        <p className="text-xs text-foreground-muted mt-1">{sop.description}</p>
      </div>

      {/* Steps Indicator */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {sop.steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isUpcoming = index > currentStepIndex;

            return (
              <div key={step.id} className="flex items-center gap-3 flex-shrink-0">
                {/* Step Indicator */}
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full font-medium text-xs transition-colors ${
                    isCurrent
                      ? 'bg-action text-white'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-500'
                      : 'bg-background-tertiary text-foreground-muted'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>

                {/* Step Label */}
                <div className="flex flex-col min-w-0">
                  <span
                    className={`text-xs font-medium truncate ${
                      isCurrent
                        ? 'text-action'
                        : isCompleted
                        ? 'text-emerald-500'
                        : 'text-foreground-muted'
                    }`}
                  >
                    {step.userFacingTitle || step.assistantFacingTitle}
                  </span>
                </div>

                {/* Arrow to next step */}
                {index < sop.steps.length - 1 && (
                  <div className="text-foreground-muted/30 text-xs flex-shrink-0">→</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Step Status */}
        <div className="mt-2">
          <p className="text-xs text-foreground-muted">
            Step {currentStepIndex + 1} of {sop.steps.length}:{' '}
            <span className="text-foreground font-medium">
              {sop.steps[currentStepIndex]?.userFacingTitle || sop.steps[currentStepIndex]?.assistantFacingTitle}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}


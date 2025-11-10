'use client';

import { useState, useEffect, useRef } from 'react';
import type { SOP } from '@/lib/types/sop';
import type { SOPRun } from '@/lib/types/sop';

interface SOPHeaderProps {
  chatId: number;
  refreshTrigger?: number;
  sop: SOP;
}

export default function SOPHeader({ chatId, refreshTrigger, sop }: SOPHeaderProps) {
  const [sopRun, setSOPRun] = useState<SOPRun | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const fetchSOPRun = async () => {
      try {
        // Only show loading on initial load, not on updates
        if (isInitialLoad.current) {
          setLoading(true);
        }
        // Fetch the latest SOP run data from the server-side function
        const response = await fetch(`/api/chats/${chatId}/run`);
        if (!response.ok) {
          throw new Error('Failed to fetch SOP run');
        }
        const data = await response.json();
        setSOPRun(data);
        
        // Mark initial load as complete and hide loading state
        if (isInitialLoad.current) {
          setLoading(false);
          isInitialLoad.current = false;
        }
      } catch (err) {
        console.error('Error fetching SOP run:', err);
        if (isInitialLoad.current) {
          setLoading(false);
          isInitialLoad.current = false;
        }
      }
    };

    fetchSOPRun();
  }, [chatId, refreshTrigger]);

  if (loading || !sopRun) {
    return (
      <div className="border-b border-border bg-background-secondary/30 px-6 py-2 flex items-center gap-4 overflow-x-auto max-h-14">
        <div className="text-foreground-muted text-xs">Loading SOP...</div>
      </div>
    );
  }

  const run = sopRun;
  
  // Check if SOP is done
  const isDone = run.currentStepId === 'DONE';
  const currentStepIndex = isDone ? sop.steps.length : sop.steps.findIndex((step) => step.id === run.currentStepId);

  const totalSteps = sop.steps.length;
  const currentStep = sop.steps[currentStepIndex];
  const progressPercent = isDone ? 100 : (currentStepIndex / totalSteps) * 100;

  return (
    <div className="border-b border-border bg-background-secondary/30 px-6 py-3 flex items-center justify-between gap-4 max-h-16">
      {/* Left: SOP Title & Progress */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex-shrink-0">
          <h2 className="text-sm font-semibold text-foreground truncate">
            {sop.displayName}
          </h2>
        </div>

        {/* Progress Bar */}
        <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isDone ? 'bg-emerald-500' : 'bg-action'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Right: Current Step Info */}
      <div className="flex-shrink-0 text-right">
        {isDone ? (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-emerald-500">✓ Complete</span>
            <span className="text-xs text-foreground-muted">{totalSteps} of {totalSteps}</span>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-action">
              {currentStep?.userFacingTitle || currentStep?.assistantFacingTitle || 'Current Step'}
            </span>
            <span className="text-xs text-foreground-muted">Step {currentStepIndex + 1} of {totalSteps}</span>
          </div>
        )}
      </div>
    </div>
  );
}


'use client';

import { useState, useRef, useEffect } from 'react';
import type { SOP, SOPStep, ExpectedOutput } from '@/lib/types/sop';
import ReactMarkdown from 'react-markdown';

export interface SOPDraft {
  id: number;
  chat_id: number;
  sop_data: SOP;
  source_tool?: string;
  created_at: string;
}

interface SOPViewerProps {
  chatId: number;
  refreshTrigger?: number;
  onClose?: () => void;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StepFlowIndicator({ nextStep }: { nextStep: string | string[] | null }) {
  if (!nextStep) {
    return <span className="text-xs text-foreground-muted">End of process</span>;
  }

  if (Array.isArray(nextStep)) {
    return (
      <div className="text-xs space-y-1">
        <span className="text-foreground-muted text-xs">Branches to:</span>
        <div className="flex flex-wrap gap-1">
          {nextStep.map((stepId) => (
            <span key={stepId} className="px-2 py-1 bg-background-secondary rounded text-foreground text-xs">
              {stepId}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <span className="text-xs text-foreground-muted">
      Next: <span className="text-foreground font-medium">{nextStep}</span>
    </span>
  );
}

function getFormatById(formatId: string | undefined, formats?: any[]) {
  if (!formatId || !formats) return null;
  return formats.find((f) => f.id === formatId);
}

export default function SOPViewer({ chatId, refreshTrigger = 0, onClose }: SOPViewerProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<SOPDraft[]>([]);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Load SOP drafts for this chat
  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/sop-drafts?chatId=${chatId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch SOP drafts');
        }

        const data = await response.json();
        setDrafts(data || []);
        
        // Select the latest draft by default
        if (data && data.length > 0) {
          setSelectedDraftIndex(data.length - 1);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load SOP drafts');
        console.error('Error fetching SOP drafts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDrafts();
  }, [chatId, refreshTrigger]);

  const selectedDraft = drafts[selectedDraftIndex];
  const selectedSOP = selectedDraft?.sop_data;

  const toggleStepExpanded = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const allStepsExpanded = selectedSOP ? expandedSteps.size === selectedSOP.steps.length : false;

  const toggleAllSteps = () => {
    if (!selectedSOP) return;
    if (allStepsExpanded) {
      setExpandedSteps(new Set());
    } else {
      setExpandedSteps(new Set(selectedSOP.steps.map((s) => s.id)));
    }
  };

  // Handle loading/error states
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-foreground-muted">Loading SOP...</p>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background-secondary rounded transition-colors text-foreground-muted hover:text-foreground"
            title="Close SOP"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-foreground-muted">
          <p className="text-sm">Loading SOP...</p>
        </div>
      </div>
    );
  }

  if (error || !selectedSOP || drafts.length === 0) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-foreground-muted">SOP Viewer</p>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background-secondary rounded transition-colors text-foreground-muted hover:text-foreground"
            title="Close SOP"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <div className="text-foreground-muted">
            <p className="text-sm">No SOP drafts yet</p>
            <p className="text-xs mt-1">SOP drafts will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">{selectedSOP.displayName}</h2>
          <div className="text-xs text-foreground-muted mt-0.5">
            v{selectedSOP.version}
            {selectedDraft?.source_tool && (
              <span className="ml-2">• {selectedDraft.source_tool.replace(/_/g, ' ')}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {drafts.length > 1 && (
            <select
              value={selectedDraftIndex}
              onChange={(e) => setSelectedDraftIndex(parseInt(e.target.value))}
              className="text-xs px-2 py-1 rounded bg-background-secondary text-foreground border border-border"
              title="Select SOP draft"
            >
              {drafts.map((draft, idx) => (
                <option key={idx} value={idx}>
                  Draft {idx + 1} • {new Date(draft.created_at).toLocaleTimeString()}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={toggleAllSteps}
            className="px-2 py-1 text-xs font-medium rounded bg-background-secondary hover:bg-background-tertiary text-foreground transition-colors border border-border"
            title={allStepsExpanded ? 'Collapse all' : 'Expand all'}
          >
            {allStepsExpanded ? 'Collapse' : 'Expand'}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background-secondary rounded transition-colors text-foreground-muted hover:text-foreground"
            title="Close SOP"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {/* SOP Metadata Card */}
          <div className="border-b border-border pb-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">{selectedSOP.displayName}</h3>
            <p className="text-xs text-foreground-muted">{selectedSOP.description}</p>
            <div className="grid grid-cols-2 gap-4 text-xs mt-3">
              <div>
                <span className="text-foreground-muted text-xs">Created</span>
                <p className="text-foreground text-xs mt-0.5">{formatDate(selectedSOP.createdAt)}</p>
              </div>
              <div>
                <span className="text-foreground-muted text-xs">Updated</span>
                <p className="text-foreground text-xs mt-0.5">{formatDate(selectedSOP.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Steps Section */}
          <div className="border-b border-border pb-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground mb-2">Steps ({selectedSOP.steps.length})</h4>
            {selectedSOP.steps.map((step) => {
              const isExpanded = expandedSteps.has(step.id);
              return (
                <div key={step.id} className="border border-border rounded overflow-hidden">
                  {/* Step Header */}
                  <button
                    onClick={() => toggleStepExpanded(step.id)}
                    className="w-full px-3 py-3 flex items-start justify-between gap-3 hover:bg-background-secondary transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-action text-white text-xs font-semibold flex items-center justify-center">
                          {step.stepNumber}
                        </span>
                        <h5 className="text-sm font-medium text-foreground truncate">
                          {step.userFacingTitle || step.assistantFacingTitle}
                        </h5>
                      </div>
                      {step.userFacingTitle && step.assistantFacingTitle !== step.userFacingTitle && (
                        <p className="text-xs text-foreground-muted ml-7">{step.assistantFacingTitle}</p>
                      )}
                    </div>
                    <svg
                      className={`w-4 h-4 flex-shrink-0 text-foreground-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {/* Step Content */}
                  {isExpanded && (
                    <div className="px-3 py-3 bg-background-secondary border-t border-border space-y-3 text-xs">
                      {/* Description */}
                      <div>
                        <p className="text-foreground-muted font-medium mb-1">Description</p>
                        <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                          {step.description}
                        </p>
                      </div>

                      {/* Expected Output */}
                      <div>
                        <p className="text-foreground-muted font-medium mb-2">Expected Output</p>
                        <div className="space-y-2">
                          {step.expectedOutput.format && (() => {
                            const format = getFormatById(step.expectedOutput.format, selectedSOP.assistantOutputFormats);
                            if (format) {
                              return (
                                <div className="mt-3 p-2 bg-background rounded border border-border">
                                  <p className="text-xs font-medium text-action mb-2">{format.name}</p>
                                  {format.requirements.length > 0 && (
                                    <div className="mb-2">
                                      <p className="text-xs text-foreground-muted font-medium mb-1">Requirements</p>
                                      <ul className="text-xs text-foreground space-y-1">
                                        {format.requirements.map((req: string, idx: number) => (
                                          <li key={idx} className="ml-3 flex gap-2">
                                            <span className="text-foreground-muted">•</span>
                                            <span>{req}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  <div className="text-xs">
                                    <p className="text-foreground-muted font-medium mb-1">Template</p>
                                    <div className="bg-background-secondary text-foreground p-2 rounded text-xs overflow-x-auto prose prose-sm dark:prose-invert max-w-none [&>*]:my-0 [&>p]:text-xs [&>pre]:bg-background [&>pre>code]:text-xs [&>code]:text-action/70">
                                      <ReactMarkdown>{format.template}</ReactMarkdown>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div>
                                <span className="text-foreground-muted font-medium">Format: </span>
                                <span className="text-foreground">{step.expectedOutput.format}</span>
                              </div>
                            );
                          })()}
                          {step.expectedOutput.description && (
                            <div>
                              <span className="text-foreground-muted font-medium">Details: </span>
                              <span className="text-foreground">{step.expectedOutput.description}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Referenced Documents */}
                      {step.referencedDocuments && step.referencedDocuments.length > 0 && (
                        <div>
                          <p className="text-foreground-muted font-medium mb-2">References</p>
                          <div className="flex flex-wrap gap-1">
                            {step.referencedDocuments.map((doc) => (
                              <span key={doc} className="px-2 py-1 rounded bg-background text-foreground text-xs">
                                {doc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Next Step Flow */}
                      <div className="pt-2 border-t border-border">
                        <p className="text-foreground-muted font-medium mb-2">Flow</p>
                        <StepFlowIndicator nextStep={step.nextStep} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* User Documents Card */}
          {selectedSOP.userDocuments.length > 0 && (
            <div className="border-b border-border pb-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">Required Documents</h4>
              <div className="space-y-2">
                {selectedSOP.userDocuments.map((doc) => (
                  <div key={doc.id} className="p-2 bg-background-secondary rounded border border-border text-xs">
                    <p className="font-medium text-foreground">{doc.name}</p>
                    <p className="text-foreground-muted mt-1">{doc.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Tools Card */}
          {selectedSOP.providedTools.length > 0 && (
            <div className="border-b border-border pb-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">Available Tools</h4>
              <div className="flex flex-wrap gap-2">
                {selectedSOP.providedTools.map((tool) => (
                  <span key={tool} className="text-xs px-2 py-1 rounded bg-background-secondary text-foreground border border-border">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Instructions */}
          {selectedSOP.generalInstructions && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">AI Instructions</h4>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {selectedSOP.generalInstructions}
              </p>
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}


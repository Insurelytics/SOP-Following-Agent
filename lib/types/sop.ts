/**
 * SOP (Standard Operating Procedure) Type Definitions
 * Defines the structure for SOPs that guide AI through multi-step workflows
 */

/**
 * Defines what the AI should produce at this step
 */
export interface ExpectedOutput {
  type: 'text' | 'markdown-document' | 'structured' | 'conversation';
  format?: string;
  description?: string;
}

/**
 * Represents a single step in a SOP
 */
export interface SOPStep {
  id: string;
  stepNumber: number;
  assistantFacingTitle: string;
  userFacingTitle?: string;
  description: string;

  // What documents/references should be visible in the doc panel
  referencedDocuments?: string[];

  // What to expect as output from this step
  expectedOutput: ExpectedOutput;

  // Next step ID, or null if this is the last step
  // Can also be an array of possible next steps for branching logic
  nextStep: string | string[] | null;
}

/**
 * Defines a reusable format template that can be referenced in steps
 */
export interface SOPFormat {
  id: string;
  name: string;
  template: string;
  requirements: string[];
}

/**
 * Represents a complete SOP template
 */
export interface SOP {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;

  // Custom instructions for the AI about the context of this SOP
  generalInstructions?: string;

  // Required documents that must be uploaded once per run
  userDocuments: {
    id: string;
    name: string;
    description: string;
    type: 'text' | 'file';
    required: boolean;
  }[];

  // Reusable format definitions that can be referenced in steps
  assistantOutputFormats?: SOPFormat[];

  // The steps in the SOP
  steps: SOPStep[];

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents an instance/run of a SOP
 */
export interface SOPRun {
  id: number;
  chatId: number;
  sopId: string;
  currentStepId: string;
  status: 'in_progress' | 'completed' | 'paused';
  startedAt: string;
  completedAt?: string;
}

/**
 * Stores the result of a step execution
 */
export interface StepResult {
  id: number;
  runId: number;
  stepId: string;
  userInputs: {
    [fieldId: string]: string | boolean | File;
  };
  aiOutput: string;
  validationStatus: 'pending' | 'valid' | 'invalid';
  validationErrors?: string[];
  createdAt: string;
}

/**
 * Stores documents for a SOP run
 */
export interface SOPDocument {
  id: number;
  runId: number;
  documentId: string;
  content: string;
  contentType: string;
  createdAt: string;
}


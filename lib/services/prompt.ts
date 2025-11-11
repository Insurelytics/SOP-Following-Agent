/**
 * System prompt utilities for conversation context
 */

import type { SOP, SOPStep } from '@/lib/types/sop';

/**
 * Finds a step in a SOP by its ID
 */
function findStepById(sop: SOP, stepId: string): SOPStep | undefined {
  return sop.steps.find(s => s.id === stepId);
}

/**
 * Generates tool-specific instructions based on available tools
 */
function generateToolInstructions(tools: string[]): string {
  const toolInstructions: { [key: string]: string } = {
    write_document: `**write_document**: Use this tool when the current step requires a specific output format (markdown-document, structured, etc.). Call with the current step ID and complete proposed output. After calling this tool:
- NEVER paste, repeat, or include the document content in your response
- NEVER summarize or quote the document text
- DO briefly confirm that you created a document ("I've created a document...")
- DO proceed directly to the next step or ask what the user would like to do next
The tool is the final output; your response should only explain what was done.`,
  };

  const relevantInstructions = tools
    .filter(tool => toolInstructions[tool])
    .map(tool => toolInstructions[tool]);

  if (relevantInstructions.length === 0) {
    return '';
  }

  return `\n\n## Tool Instructions\n\n${relevantInstructions.join('\n\n')}`;
}


/**
 * Creates the system prompt for the conversation
 * Includes current date, model information, and optional SOP context with current step
 */
export function createSystemPrompt(model: string, sop?: SOP, currentStepId?: string): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let prompt = `You are ${model}. Today's date is ${currentDate}.`;

  if (sop) {
    // Add general instructions at the top if present
    if (sop.generalInstructions) {
      prompt += `\n\n## Context\n\n${sop.generalInstructions}`;
    }

    // Add the full SOP structure as JSON (without generalInstructions, already shown in Context)
    const sopForJSON = { ...sop };
    delete sopForJSON.generalInstructions;
    prompt += `\n\n## SOP (Standard Operating Procedure)\n\n${JSON.stringify(sopForJSON, null, 2)}`;

    // Add current step details
    const currentStep = currentStepId ? findStepById(sop, currentStepId) : sop.steps[0];
    
    let validNextSteps: string[] = [];
    if (currentStep?.nextStep) {
      validNextSteps = typeof currentStep.nextStep === 'string' 
        ? [currentStep.nextStep] 
        : currentStep.nextStep;
    }

    if (currentStep) {
      prompt += `\n\n## Current Step\n\n${JSON.stringify(currentStep, null, 2)}`;
    }

    if (validNextSteps.length > 0) {
      prompt += `\n\n## Valid Next Steps\n\nWhen you complete the current step, you can advance to one of these steps:\n${validNextSteps.map(s => `- ${s}`).join('\n')}`;
    }

    // Add tool instructions for available tools
    const toolInstructions = generateToolInstructions(sop.providedTools);
    if (toolInstructions) {
      prompt += toolInstructions;
    }
  }

  return prompt;
}

/**
 * Checks if a message is the initial SOP start command
 */
export function isInitialSOPStart(message: string): boolean {
  return message === '[SOP_START]';
}


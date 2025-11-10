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
    const currentStep = currentStepId ? findStepById(sop, currentStepId) : sop.steps[0];
    
    let validNextSteps: string[] = [];
    if (currentStep?.nextStep) {
      validNextSteps = typeof currentStep.nextStep === 'string' 
        ? [currentStep.nextStep] 
        : currentStep.nextStep;
    }

    prompt += `\n\n## SOP (Standard Operating Procedure)\n\nYou are running this workflow:\n\n${JSON.stringify(sop, null, 2)}`;

    prompt += `\n\n## Current Step\n\nYou are currently on this step:\n\n${JSON.stringify(currentStep, null, 2)}`;

    if (validNextSteps.length > 0) {
      prompt += `\n\n## Valid Next Steps\n\nWhen you complete the current step, you can advance to one of these steps:\n${validNextSteps.map(s => `- ${s}`).join('\n')}`;
    }

    prompt += `\n\n## Important Instructions\n\nWhenever providing output that requires a specific format (markdown-document, structured, etc.), you MUST call the \`write_document\` tool with the current step ID and the complete proposed output. This validates that your output meets the format requirements.\n\n**CRITICAL**: After calling the write_document tool:\n- NEVER paste, repeat, or include the document content in your response\n- NEVER summarize or quote the document text\n- DO briefly confirm that you did create a document. ("I've created a document...")\n- DO proceed directly to the next step or ask the user what they'd like to do next\n\nThe tool is the final output. Your response should only explain what was done, not reproduce what was written.`;
  }

  return prompt;
}


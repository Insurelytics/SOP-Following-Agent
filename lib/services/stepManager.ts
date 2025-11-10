/**
 * Step Manager Service
 * Uses Instructor to intelligently determine which step to transition to
 * based on user messages and the current workflow state
 */

import { z } from 'zod';
import createInstructor from '@instructor-ai/instructor';
import OpenAI from 'openai';
import type { SOP, SOPStep } from '@/lib/types/sop';

/**
 * Get valid next steps from the current step
 */
function getValidNextSteps(step: SOPStep): string[] {
  const validSteps = ['stay_on_current_step'];
  
  if (step.nextStep) {
    if (typeof step.nextStep === 'string') {
      validSteps.push(step.nextStep);
    } else if (Array.isArray(step.nextStep)) {
      validSteps.push(...step.nextStep);
    }
  }
  
  return validSteps;
}

/**
 * Determines which step to transition to based on the user message
 * Uses Instructor to get a structured decision from the model
 */
export async function determineNextStep(
  userMessage: string,
  currentStep: SOPStep,
  sop: SOP
): Promise<{ stepId: string }> {
  try {
    const validNextSteps = getValidNextSteps(currentStep);

    // Create schema with enum enforcing valid steps
    const StepDecisionSchema = z.object({
      nextStep: z.enum(validNextSteps as unknown as readonly [string, ...string[]]),
    });

    // Initialize Instructor with OpenAI
    const client = createInstructor({
      client: new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      }),
      mode: 'TOOLS',
    });

    // Build the prompt
    const prompt = `You are a workflow manager. Based on the user's message and the complete SOP context, determine which step the workflow should transition to.

User Message: "${userMessage}"

Complete SOP:
${JSON.stringify(sop, null, 2)}

Current Step ID: ${currentStep.id}

Valid Next Steps: ${validNextSteps.join(', ')}

Analyze the user's message and the current step requirements. Decide whether to:
1. Stay on the current step (if more work is needed)
2. Advance to one of the valid next steps (if the current step is complete)`;

    const decision = await client.chat.completions.create({
      model: process.env.MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_model: {
        schema: StepDecisionSchema,
        name: 'StepDecision',
      },
    });

    // Validate the decision
    const nextStep = (decision as any).nextStep;
    if (!validNextSteps.includes(nextStep)) {
      console.warn(
        `Model returned invalid step "${nextStep}". Valid options: ${validNextSteps.join(', ')}. Staying on current step.`
      );
      return {
        stepId: currentStep.id,
      };
    }

    // If staying on current step, return current step ID
    if (nextStep === 'stay_on_current_step') {
      return {
        stepId: currentStep.id,
      };
    }

    // Otherwise return the decided step ID
    return {
      stepId: nextStep,
    };
  } catch (error) {
    console.error('Error determining next step:', error);
    // On error, stay on current step
    return {
      stepId: currentStep.id,
    };
  }
}


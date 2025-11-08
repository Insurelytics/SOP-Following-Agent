/**
 * System prompt utilities for conversation context
 */

/**
 * Creates the system prompt for the conversation
 * Includes current date and model information
 */
export function createSystemPrompt(model: string): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `You are ${model}. Today's date is ${currentDate}. Your role is to help the user with their questions and tasks.`;
}


/**
 * OpenAI client and tool configuration
 * Handles initialization and tool definitions
 */

import OpenAI from 'openai';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

// ============================================================================
// Client Initialization
// ============================================================================

/**
 * OpenAI API client instance
 * Configured with API key from environment
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Model Configuration
// ============================================================================

/**
 * Get model from environment variable, default to gpt-4o-mini
 */
export const DEFAULT_MODEL = process.env.MODEL || 'gpt-4o-mini';

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Example add tool for arithmetic operations
 */
export const addTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'add',
    description: 'Adds two numbers together',
    parameters: {
      type: 'object',
      properties: {
        a: {
          type: 'number',
          description: 'The first number',
        },
        b: {
          type: 'number',
          description: 'The second number',
        },
      },
      required: ['a', 'b'],
    },
  },
};

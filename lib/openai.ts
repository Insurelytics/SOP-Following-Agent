/**
 * OpenAI client and tool configuration
 * Handles initialization, tool definitions, and tool execution
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
 * Get model from environment variable, default to gpt-5-nano
 */
export const DEFAULT_MODEL = process.env.MODEL || 'gpt-5-nano';
console.log('DEFAULT_MODEL', DEFAULT_MODEL);

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Addition tool that adds two numbers
 */
export const addTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'add',
    description: 'Adds two numbers together and returns the sum',
    parameters: {
      type: 'object',
      properties: {
        a: {
          type: 'number',
          description: 'The first number to add',
        },
        b: {
          type: 'number',
          description: 'The second number to add',
        },
      },
      required: ['a', 'b'],
    },
  },
};

// ============================================================================
// Tool Implementations
// ============================================================================

/**
 * Executes the add tool
 * @param a - First number
 * @param b - Second number
 * @returns The sum of a and b
 */
function executeAddTool(a: number, b: number): number {
  return a + b;
}

/**
 * Dispatcher to execute any tool by name
 * @param toolName - Name of the tool to execute
 * @param args - Arguments to pass to the tool
 * @returns Result of tool execution
 * @throws Error if tool name is unknown
 */
export function executeTool(toolName: string, args: any): any {
  switch (toolName) {
    case 'add':
      return executeAddTool(args.a, args.b);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Type for conversation messages with tool support
 */
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

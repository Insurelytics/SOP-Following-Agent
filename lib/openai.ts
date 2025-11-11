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
 * Write document tool for SOP workflows
 * Allows the AI to write and display a formatted document
 */
export const writeDocumentTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'write_document',
    description: 'Writes a formatted document for the current SOP step. The document is validated against the step requirements and displayed to the user automatically.',
    parameters: {
      type: 'object',
      properties: {
        stepId: {
          type: 'string',
          description: 'The ID of the current SOP step',
        },
        documentName: {
          type: 'string',
          description: 'The name/title of the document being written',
        },
        content: {
          type: 'string',
          description: 'The document content to write',
        },
      },
      required: ['stepId', 'documentName', 'content'],
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

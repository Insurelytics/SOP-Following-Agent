import OpenAI from 'openai';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the add function tool
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

// Tool implementations
export function executeAddTool(a: number, b: number): number {
  return a + b;
}

// Helper to execute any tool by name
export function executeTool(toolName: string, args: any): any {
  switch (toolName) {
    case 'add':
      return executeAddTool(args.a, args.b);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Available models
export const MODELS = {
  NANO: 'gpt-5-nano',
  MINI: 'gpt-5-mini',
} as const;

export type ModelType = typeof MODELS[keyof typeof MODELS];

// Type for conversation messages
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
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


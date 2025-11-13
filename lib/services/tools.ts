/**
 * Tool execution service
 * Handles parsing, validation, and execution of AI-called tools
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * Represents a parsed tool call from the model
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Result of executing a tool
 */
export interface ToolExecutionResult {
  toolCall: ToolCall;
  args: any;
  result: any;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * Context for tool execution
 */
export interface ToolExecutionContext {
  chatId: number;
}

/**
 * Executes a single tool call and returns the result with metadata
 */
export function executeSingleTool(toolCall: ToolCall, _context?: ToolExecutionContext): ToolExecutionResult {
  try {
    const args = JSON.parse(toolCall.function.arguments);
    let result: any;

    if (toolCall.function.name === 'add') {
      // Simple add tool example
      const { a, b } = args;
      if (typeof a !== 'number' || typeof b !== 'number') {
        result = `Error: add tool requires numeric arguments. Received a=${a}, b=${b}`;
      } else {
        result = `The sum of ${a} and ${b} is ${a + b}`;
      }
    } else {
      result = `Tool "${toolCall.function.name}" is not available`;
    }
    
    return {
      toolCall,
      args,
      result,
      metadata: {},
    };
  } catch (error) {
    return {
      toolCall,
      args: {},
      result: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Executes multiple tool calls
 */
export function executeMultipleTools(toolCalls: ToolCall[], context?: ToolExecutionContext): ToolExecutionResult[] {
  return toolCalls.map(toolCall => executeSingleTool(toolCall, context));
}

/**
 * Converts tool execution results into conversation messages
 * Adds the tool results to the conversation history
 */
export function convertToolResultsToMessages(
  toolCall: ToolCall,
  result: ToolExecutionResult
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  // Add the assistant's tool call
  messages.push({
    role: 'assistant',
    content: null,
    tool_calls: [toolCall],
  } as any);

  // Add the tool's response
  messages.push({
    role: 'tool',
    content: JSON.stringify(result.result),
    tool_call_id: toolCall.id,
  } as any);

  return messages;
}


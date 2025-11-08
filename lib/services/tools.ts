/**
 * Tool execution service
 * Handles parsing, validation, and execution of AI-called tools
 */

import { executeTool as executeToolFromOpenAI } from '@/lib/openai';
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
}

/**
 * Executes a single tool call and returns the result
 */
export function executeSingleTool(toolCall: ToolCall): ToolExecutionResult {
  try {
    const args = JSON.parse(toolCall.function.arguments);
    const result = executeToolFromOpenAI(toolCall.function.name, args);

    return {
      toolCall,
      args,
      result,
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
export function executeMultipleTools(toolCalls: ToolCall[]): ToolExecutionResult[] {
  return toolCalls.map(executeSingleTool);
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


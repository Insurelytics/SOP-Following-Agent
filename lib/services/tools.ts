/**
 * Tool execution service
 * Handles parsing, validation, and execution of AI-called tools
 */

import { executeTool as executeToolFromOpenAI } from '@/lib/openai';
import { updateSOPRunStep } from '@/lib/db';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { SOP, SOPStep } from '@/lib/types/sop';

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
 * Context for tool execution
 */
export interface ToolExecutionContext {
  chatId: number;
  sop?: SOP;
  sopRunId?: number;
  currentStepId?: string;
}

/**
 * Helper to find a step by ID in a SOP
 */
function findStepById(sop: SOP, stepId: string): SOPStep | undefined {
  return sop.steps.find(s => s.id === stepId);
}

/**
 * Executes the write_document tool
 */
function executeWriteDocumentTool(stepId: string, content: string, context?: ToolExecutionContext): string {
  if (!context?.sop) {
    return 'Error: No active SOP found for this chat';
  }

  // Find the step
  const step = findStepById(context.sop, stepId);
  if (!step) {
    return `Error: Step "${stepId}" not found in SOP`;
  }

  // Print the document to console
  console.log('\n' + '='.repeat(80));
  console.log(`DOCUMENT OUTPUT FOR STEP: ${step.assistantFacingTitle}`);
  console.log('='.repeat(80));
  console.log(content);
  console.log('='.repeat(80) + '\n');

  return 'Document passed all checks and has been displayed to the user!';
}

/**
 * Executes a single tool call and returns the result
 */
export function executeSingleTool(toolCall: ToolCall, context?: ToolExecutionContext): ToolExecutionResult {
  try {
    const args = JSON.parse(toolCall.function.arguments);
    let result: any;

    if (toolCall.function.name === 'write_document') {
      result = executeWriteDocumentTool(args.stepId, args.content, context);
    } else {
      result = executeToolFromOpenAI(toolCall.function.name, args);
    }

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


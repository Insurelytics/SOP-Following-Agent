/**
 * Chat streaming service
 * Handles streaming responses from OpenAI with tool execution
 */

import { openai } from '@/lib/openai';
import { executeSingleTool, convertToolResultsToMessages, type ToolCall, type ToolExecutionContext } from './tools';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface StreamData {
  type: 'content' | 'tool' | 'done' | 'error';
  content?: string;
  name?: string;
  args?: any;
  result?: any;
  message?: string;
  messagesToSave?: ChatCompletionMessageParam[]; // Tool call and result messages to persist
}

/**
 * Aggregates tool calls from streaming chunks
 */
function aggregateToolCalls(
  toolCalls: ToolCall[],
  deltaToolCalls: any[]
): ToolCall[] {
  for (const toolCall of deltaToolCalls) {
    if (!toolCalls[toolCall.index]) {
      toolCalls[toolCall.index] = {
        id: toolCall.id || '',
        type: 'function',
        function: {
          name: toolCall.function?.name || '',
          arguments: toolCall.function?.arguments || '',
        },
      };
    } else {
      if (toolCall.function?.arguments) {
        toolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
      }
      if (toolCall.function?.name) {
        toolCalls[toolCall.index].function.name = toolCall.function.name;
      }
      if (toolCall.id) {
        toolCalls[toolCall.index].id = toolCall.id;
      }
    }
  }
  return toolCalls;
}

/**
 * Handles the streaming response from the initial API call
 * Yields content and tool calls as they arrive
 */
export async function* streamInitialCompletion(
  model: string,
  messages: ChatCompletionMessageParam[],
  tools: any[]
): AsyncGenerator<{
  type: 'content' | 'toolCalls' | 'done';
  content?: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
}> {
  const completion = await openai.chat.completions.create({
    model,
    messages,
    tools,
    tool_choice: 'auto',
    stream: true,
  });

  let fullResponse = '';
  let toolCalls: ToolCall[] = [];

  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta;

    // Handle content
    if (delta?.content) {
      fullResponse += delta.content;
      yield {
        type: 'content',
        content: delta.content,
      };
    }

    // Handle tool calls
    if (delta?.tool_calls) {
      toolCalls = aggregateToolCalls(toolCalls, delta.tool_calls);
    }

    // Check for completion
    if (chunk.choices[0]?.finish_reason) {
      yield {
        type: 'done',
        finishReason: chunk.choices[0].finish_reason,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
      break;
    }
  }
}

/**
 * Gets the final completion after tool execution
 * Used when tools were called to get the model's final response
 */
export async function* streamFinalCompletion(
  model: string,
  messages: ChatCompletionMessageParam[]
): AsyncGenerator<string> {
  const finalCompletion = await openai.chat.completions.create({
    model,
    messages,
    stream: true,
  });

  for await (const chunk of finalCompletion) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.content) {
      yield delta.content;
    }
  }
}

/**
 * Main streaming handler
 * Orchestrates the entire streaming flow including tool execution
 */
export async function* handleChatStream(
  model: string,
  messages: ChatCompletionMessageParam[],
  tools: any[],
  toolContext?: ToolExecutionContext
): AsyncGenerator<StreamData> {
  let fullResponse = '';
  let toolsWereExecuted = false;
  let conversationMessages = [...messages];

  // Initial completion
  for await (const chunk of streamInitialCompletion(model, conversationMessages, tools)) {
    if (chunk.type === 'content') {
      fullResponse += chunk.content || '';
      yield {
        type: 'content',
        content: chunk.content,
      };
    }

    if (chunk.type === 'done') {
      // If tools were called, execute them
      if (chunk.finishReason === 'tool_calls' && chunk.toolCalls && chunk.toolCalls.length > 0) {
        toolsWereExecuted = true;

        // Execute tools and send results
        for (const toolCall of chunk.toolCalls) {
          const executionResult = executeSingleTool(toolCall, toolContext);

          // Convert tool results to messages that should be saved to database
          const toolMessages = convertToolResultsToMessages(toolCall, executionResult);

          yield {
            type: 'tool',
            name: toolCall.function.name,
            args: executionResult.args,
            result: executionResult.result,
            messagesToSave: toolMessages,
          };

          // Add tool results to conversation
          conversationMessages.push(...toolMessages);
        }

        // Get final response after tool execution
        fullResponse = '';
        for await (const content of streamFinalCompletion(model, conversationMessages)) {
          fullResponse += content;
          yield {
            type: 'content',
            content,
          };
        }
      }

      yield {
        type: 'done',
      };
      break;
    }
  }

  return {
    fullResponse,
    toolsWereExecuted,
    conversationMessages,
  };
}


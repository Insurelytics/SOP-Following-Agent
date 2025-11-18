/**
 * Chat streaming service
 * Handles streaming responses from OpenAI with tool execution
 */

import { openai } from '@/lib/openai';
import { executeSingleTool, convertToolResultsToMessages, type ToolCall, type ToolExecutionContext } from './tools';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface StreamData {
  type: 'content' | 'tool' | 'done' | 'error' | 'document_stream';
  content?: string;
  name?: string;
  args?: any;
  result?: any;
  message?: string;
  metadata?: Record<string, any>; // Extensible metadata (e.g., documentName, documentId)
  messagesToSave?: ChatCompletionMessageParam[]; // Tool call and result messages to persist
  documentName?: string;
  html?: string;
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
 * Best-effort extraction of partial HTML content from a write_document tool's
 * JSON-encoded arguments string.
 *
 * Strategy:
 * - Find the "content" field.
 * - Take everything up to the last ">" character (usually end of a tag).
 * - Unescape common JSON escape sequences.
 * - Strip inline styles and <style> tags for consistent theming in the preview.
 * - Optionally extract documentName for display.
 */
function extractPartialHtmlFromWriteDocumentArgs(args: string | undefined): { html: string; documentName?: string } | null {
  if (!args) return null;

  // Extract documentName (best-effort, assumes no quotes inside the name)
  let documentName: string | undefined;
  const docNameMatch = args.match(/"documentName":"([^"]*)/);
  if (docNameMatch && typeof docNameMatch[1] === 'string') {
    documentName = docNameMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  const contentKey = '"content":"';
  const contentIndex = args.indexOf(contentKey);
  if (contentIndex === -1) {
    return { html: '', documentName };
  }

  const afterContent = args.slice(contentIndex + contentKey.length);
  const lastGtIndex = afterContent.lastIndexOf('>');
  if (lastGtIndex === -1) {
    // No completed tag yet
    return null;
  }

  let rawEscaped = afterContent.slice(0, lastGtIndex + 1);

  // Best-effort unescaping of JSON string content
  rawEscaped = rawEscaped
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\//g, '/');

  // Strip <style> blocks entirely
  let sanitized = rawEscaped.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Strip inline style="..." and style='...' attributes
  sanitized = sanitized
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\sstyle='[^']*'/gi, '');

  return {
    html: sanitized,
    documentName,
  };
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
  let hasLoggedFirstToolCall = false;

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

      // Lightweight debug logging: only log the first observed tool call once
      if (!hasLoggedFirstToolCall && toolCalls.length > 0) {
        hasLoggedFirstToolCall = true;
        const first = toolCalls[0];
        const argsPreview =
          typeof first.function.arguments === 'string'
            ? first.function.arguments.slice(0, 300)
            : first.function.arguments;

        console.log('[streamInitialCompletion] First tool call detected:', {
          id: first.id,
          name: first.function.name,
          argsPreview,
        });
      }

      // Emit aggregated tool calls so the caller can react to the tool selection
      yield {
        type: 'toolCalls',
        toolCalls,
      };
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
  let toolStartEmitted = false;
  let lastDocumentPreview: string | null = null;

  // Initial completion
  for await (const chunk of streamInitialCompletion(model, conversationMessages, tools)) {
    if (chunk.type === 'content') {
      fullResponse += chunk.content || '';
      yield {
        type: 'content',
        content: chunk.content,
      };
    }

    // As soon as the model starts emitting tool calls, surface the selected tool
    // to the client and, for write_document, stream a best-effort HTML preview.
    if (chunk.type === 'toolCalls' && chunk.toolCalls && chunk.toolCalls.length > 0) {
      const firstToolCall = chunk.toolCalls[0];

      if (!toolStartEmitted) {
        toolStartEmitted = true;
        yield {
          type: 'tool',
          name: firstToolCall.function.name,
          args: firstToolCall.function.arguments,
        };
      }

      // Stream partial document HTML for write_document tool calls
      if (firstToolCall.function.name === 'write_document') {
        const preview = extractPartialHtmlFromWriteDocumentArgs(firstToolCall.function.arguments);
        if (preview && preview.html && preview.html !== lastDocumentPreview) {
          lastDocumentPreview = preview.html;

          yield {
            type: 'document_stream',
            name: firstToolCall.function.name,
            documentName: preview.documentName,
            html: preview.html,
          };
        }
      }
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
            metadata: executionResult.metadata,
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


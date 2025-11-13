import { NextRequest } from 'next/server';
import { DEFAULT_MODEL, addTool } from '@/lib/openai';
import { saveMessage, getMessages, getChat, saveToolCallMessage, saveToolResultMessage } from '@/lib/db';
import { createSystemPrompt } from '@/lib/services/prompt';
import { handleChatStream } from '@/lib/services/chat-stream';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ToolExecutionContext } from '@/lib/services/tools';

/**
 * Validates the incoming request
 */
function validateRequest(chatId: unknown, message: unknown): { valid: boolean; error?: string } {
  if (!chatId || !message) {
    return { valid: false, error: 'chatId and message are required' };
  }
  return { valid: true };
}

/**
 * Prepares the conversation messages with system prompt
 * Properly reconstructs tool call and tool result messages from stored data
 * Includes file attachments in user messages (images via base64)
 */
function prepareConversationMessages(
  model: string,
  history: any[]
): ChatCompletionMessageParam[] {
  const conversationMessages: ChatCompletionMessageParam[] = history.map((msg) => {
    // Handle assistant messages with tool calls
    if (msg.role === 'assistant' && msg.tool_calls) {
      return {
        role: 'assistant',
        content: null,
        tool_calls: JSON.parse(msg.tool_calls),
      } as any;
    }
    
    // Handle tool result messages
    if (msg.role === 'tool' && msg.tool_call_id) {
      return {
        role: 'tool',
        content: msg.content,
        tool_call_id: msg.tool_call_id,
      } as any;
    }

    // Handle user messages with file attachments
    if (msg.role === 'user') {
      const msgContent: any[] = [];
      
      // Add text content
      if (msg.content) {
        msgContent.push({
          type: 'text',
          text: msg.content,
        });
      }

      // Add file attachments (images)
      if (msg.file_attachments) {
        try {
          const attachments = JSON.parse(msg.file_attachments);
          for (const attachment of attachments) {
            if (attachment.is_image && attachment.base64) {
              // Add image as base64 using the correct OpenAI format
              msgContent.push({
                type: 'image_url',
                image_url: {
                  url: `data:${attachment.file_type};base64,${attachment.base64}`,
                },
              });
            }
          }
        } catch (e) {
          console.error('Error parsing file attachments:', e);
        }
      }

      return {
        role: 'user',
        content: msgContent.length > 0 ? msgContent : (msg.content || ''),
      } as any;
    }

    // Handle regular assistant messages
    return {
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content || '',
    } as ChatCompletionMessageParam;
  });

  // Prepend system prompt
  const systemPrompt = createSystemPrompt(model);
  conversationMessages.unshift({
    role: 'system',
    content: systemPrompt,
  } as ChatCompletionMessageParam);

  return conversationMessages;
}

/**
 * POST /api/chat - Streaming chat endpoint
 * Handles user messages and streams responses with tool support
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, message, files } = body;
    const model = DEFAULT_MODEL;

    // Validate request
    const validation = validateRequest(chatId, message);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Convert chatId to number
    const numChatId = Number(chatId);

    // Verify chat exists
    const chat = getChat(numChatId);
    if (!chat) {
      return new Response(JSON.stringify({ error: 'Chat not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Save user message
    saveMessage(numChatId, 'user', message, files);

    // Get conversation history
    const history = getMessages(numChatId);
    const conversationMessages = prepareConversationMessages(model, history);

    // Prepare tool execution context
    const toolContext: ToolExecutionContext = {
      chatId: numChatId,
    };

    // Create a ReadableStream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';

          // Stream the chat completion with available tools
          for await (const streamData of handleChatStream(model, conversationMessages, [addTool], toolContext)) {
            // Accumulate full response for saving
            if (streamData.type === 'content') {
              fullResponse += streamData.content || '';
            }

            // Save tool messages to database when tools are executed
            if (streamData.type === 'tool' && streamData.messagesToSave) {
              for (const msg of streamData.messagesToSave) {
                if (msg.role === 'assistant' && 'tool_calls' in msg && msg.tool_calls) {
                  // Save the assistant's tool call message
                  saveToolCallMessage(numChatId, msg.tool_calls);
                } else if (msg.role === 'tool' && 'tool_call_id' in msg && msg.tool_call_id) {
                  // Save the tool's result message with tool name and metadata
                  saveToolResultMessage(numChatId, msg.tool_call_id, msg.content, streamData.name, streamData.metadata);
                }
              }
            }

            // Send all stream data to client
            const data = JSON.stringify(streamData);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));

            // Save response when stream is done
            if (streamData.type === 'done' && fullResponse) {
              saveMessage(numChatId, 'assistant', fullResponse);
            }
          }

          controller.close();
        } catch (error) {
          console.error('Error in stream:', error);
          const errorData = JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


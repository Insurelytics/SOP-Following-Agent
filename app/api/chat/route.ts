import { NextRequest } from 'next/server';
import { addTool, DEFAULT_MODEL } from '@/lib/openai';
import { saveMessage, getMessages, getChat } from '@/lib/db';
import { createSystemPrompt } from '@/lib/services/prompt';
import { handleChatStream } from '@/lib/services/chat-stream';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

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
 */
function prepareConversationMessages(
  model: string,
  history: any[]
): ChatCompletionMessageParam[] {
  const conversationMessages: ChatCompletionMessageParam[] = history.map((msg) => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
  }));

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
    const { chatId, message } = body;
    const model = DEFAULT_MODEL;
    console.log('model', model);

    // Validate request
    const validation = validateRequest(chatId, message);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify chat exists
    const chat = getChat(chatId);
    if (!chat) {
      return new Response(JSON.stringify({ error: 'Chat not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Save user message
    saveMessage(chatId, 'user', message);

    // Get conversation history
    const history = getMessages(chatId);
    const conversationMessages = prepareConversationMessages(model, history);

    // Create a ReadableStream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';

          // Stream the chat completion with tool support
          for await (const streamData of handleChatStream(model, conversationMessages, addTool)) {
            // Accumulate full response for saving
            if (streamData.type === 'content') {
              fullResponse += streamData.content || '';
            }

            // Send all stream data to client
            const data = JSON.stringify(streamData);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));

            // Save response when stream is done
            if (streamData.type === 'done' && fullResponse) {
              saveMessage(chatId, 'assistant', fullResponse);
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


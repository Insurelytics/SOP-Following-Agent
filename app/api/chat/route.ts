import { NextRequest } from 'next/server';
import { openai, addTool, executeTool, DEFAULT_MODEL } from '@/lib/openai';
import { saveMessage, getMessages, getChat } from '@/lib/db';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// POST /api/chat - Streaming chat endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, message } = body;
    const model = DEFAULT_MODEL;
    console.log('model', model);

    if (!chatId || !message) {
      return new Response(
        JSON.stringify({ error: 'chatId and message are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify chat exists
    const chat = getChat(chatId);
    if (!chat) {
      return new Response(
        JSON.stringify({ error: 'Chat not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Save user message
    saveMessage(chatId, 'user', message);

    // Get conversation history
    const history = getMessages(chatId);
    const conversationMessages: ChatCompletionMessageParam[] = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Prepend system prompt
    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const systemPrompt = `You are ${model}. Today's date is ${currentDate}.  Your role is to help the user with their questions and tasks.`;
    conversationMessages.unshift({
      role: 'system',
      content: systemPrompt,
    } as ChatCompletionMessageParam);

    // Create a ReadableStream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Call OpenAI Chat Completions API with streaming
          // Note: Using Chat Completions API for now as it's the current standard
          // Will update to Responses API when available
          const completion = await openai.chat.completions.create({
            model: model,
            messages: conversationMessages,
            tools: [addTool],
            tool_choice: 'auto',
            stream: true,
          });

          let fullResponse = '';
          let toolCalls: any[] = [];

          // Stream the response
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta;

            // Handle content delta
            if (delta?.content) {
              fullResponse += delta.content;
              const data = JSON.stringify({ 
                type: 'content', 
                content: delta.content 
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            // Handle tool calls
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
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
            }

            // Check if stream is done
            if (chunk.choices[0]?.finish_reason) {
              const finishReason = chunk.choices[0].finish_reason;

              // Handle tool calls if present
              if (finishReason === 'tool_calls' && toolCalls.length > 0) {
                // Execute tool calls
                for (const toolCall of toolCalls) {
                  try {
                    const args = JSON.parse(toolCall.function.arguments);
                    const result = executeTool(toolCall.function.name, args);
                    
                    // Send tool execution result to client
                    const toolData = JSON.stringify({
                      type: 'tool',
                      name: toolCall.function.name,
                      args,
                      result,
                    });
                    controller.enqueue(encoder.encode(`data: ${toolData}\n\n`));

                    // Add tool result to conversation
                    conversationMessages.push({
                      role: 'assistant',
                      content: null,
                      tool_calls: [toolCall],
                    } as any);

                    conversationMessages.push({
                      role: 'tool',
                      content: JSON.stringify(result),
                      tool_call_id: toolCall.id,
                    } as any);
                  } catch (error) {
                    console.error('Error executing tool:', error);
                  }
                }

                // Get final response from model with tool results
                const finalCompletion = await openai.chat.completions.create({
                  model: model,
                  messages: conversationMessages,
                  stream: true,
                });

                fullResponse = '';
                for await (const finalChunk of finalCompletion) {
                  const finalDelta = finalChunk.choices[0]?.delta;
                  if (finalDelta?.content) {
                    fullResponse += finalDelta.content;
                    const data = JSON.stringify({ 
                      type: 'content', 
                      content: finalDelta.content 
                    });
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                  }
                }
              }

              // Save assistant response
              if (fullResponse) {
                saveMessage(chatId, 'assistant', fullResponse);
              }

              // Send done signal
              controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
              break;
            }
          }

          controller.close();
        } catch (error) {
          console.error('Error in stream:', error);
          const errorData = JSON.stringify({ 
            type: 'error', 
            message: error instanceof Error ? error.message : 'Unknown error' 
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
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


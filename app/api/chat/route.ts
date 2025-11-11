import { NextRequest } from 'next/server';
import { writeDocumentTool, DEFAULT_MODEL } from '@/lib/openai';
import { saveMessage, getMessages, getChat, getActiveSOPRun, getSOP, saveToolCallMessage, saveToolResultMessage, updateSOPRunStep } from '@/lib/db';
import { createSystemPrompt, isInitialSOPStart } from '@/lib/services/prompt';
import { handleChatStream } from '@/lib/services/chat-stream';
import { determineNextStep } from '@/lib/services/stepManager';
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
 */
function prepareConversationMessages(
  model: string,
  history: any[],
  sop?: any,
  currentStepId?: string
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

    // Handle regular user and assistant messages
    return {
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content || '',
    } as ChatCompletionMessageParam;
  });

  // Prepend system prompt
  const systemPrompt = createSystemPrompt(model, sop, currentStepId);
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

    // Fetch active SOP for this chat if one exists
    const sopRun = getActiveSOPRun(numChatId);
    let sop = undefined;
    if (sopRun) {
      sop = getSOP(sopRun.sopId);
      console.log('Found active SOP run:', sopRun.sopId);
      console.log('SOP data:', sop);
    }

    // Check if this is an initial SOP start command
    const isSOPStart = isInitialSOPStart(message);
    
    // Save user message only if it's not a system command
    if (!isSOPStart) {
      saveMessage(numChatId, 'user', message);
    }

    // Get conversation history
    const history = getMessages(numChatId);
    const conversationMessages = prepareConversationMessages(model, history, sop, sopRun?.currentStepId);

    // Prepare tool execution context
    const toolContext: ToolExecutionContext = {
      chatId: numChatId,
      sop,
      sopRunId: sopRun?.id,
      currentStepId: sopRun?.currentStepId,
    };

    // Determine next step before generating AI response (if SOP is active and not a start command)
    let currentStepId = sopRun?.currentStepId;
    let stepDecision: { stepId: string } | null = null;
    
    if (sop && currentStepId && !isSOPStart) {
      const currentStep = sop.steps.find(s => s.id === currentStepId);
      if (currentStep) {
        try {
          stepDecision = await determineNextStep(message, currentStep, sop);
          
          // Update the step if it changed
          if (stepDecision.stepId !== currentStepId && sopRun) {
            updateSOPRunStep(sopRun.id, stepDecision.stepId);
            currentStepId = stepDecision.stepId;
            toolContext.currentStepId = currentStepId;
            console.log(`Step transition: ${sopRun.currentStepId} → ${stepDecision.stepId}`);
          }
        } catch (error) {
          console.error('Error determining next step:', error);
          // Continue with current step if step determination fails
        }
      }
    }

    // Recreate conversation messages with potentially updated step
    const updatedConversationMessages = prepareConversationMessages(model, history, sop, currentStepId);

    // Create a ReadableStream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';

          // Send step decision if one was made
          if (stepDecision && stepDecision.stepId !== sopRun?.currentStepId) {
            const stepDecisionData = JSON.stringify({
              type: 'step_transition',
              previousStep: sopRun?.currentStepId,
              nextStep: stepDecision.stepId,
            });
            controller.enqueue(encoder.encode(`data: ${stepDecisionData}\n\n`));
          }

          // Stream the chat completion with tool support
          for await (const streamData of handleChatStream(model, updatedConversationMessages, [writeDocumentTool], toolContext)) {
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
                  // Save the tool's result message with tool name
                  saveToolResultMessage(numChatId, msg.tool_call_id, msg.content, streamData.name);
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


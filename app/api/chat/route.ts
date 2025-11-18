import { NextRequest } from 'next/server';
import { writeDocumentTool, displaySOPTool, proposeSOPEditsTool, overwriteSOPTool, createSOPTool, deleteSOPTool, DEFAULT_MODEL } from '@/lib/openai';
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
 * Converts file attachments to OpenAI message content format
 */
function convertFileAttachments(fileAttachmentsJson: string): any[] {
  const attachments: any[] = [];
  try {
    const parsed = JSON.parse(fileAttachmentsJson);
    for (const attachment of parsed) {
      if (attachment.is_image && attachment.base64) {
        attachments.push({
          type: 'image_url',
          image_url: {
            url: `data:${attachment.file_type};base64,${attachment.base64}`,
          },
        });
      } else if (attachment.file_id && attachment.is_pdf) {
        attachments.push({
          type: 'file',
          file: {
            file_id: attachment.file_id,
          },
        });
      } else if (attachment.extracted_text && attachment.requires_text_extraction) {
        attachments.push({
          type: 'text',
          text: `**File: ${attachment.filename}**\n${attachment.extracted_text}`,
        });
      }
    }
  } catch (e) {
    console.error('Error parsing file attachments:', e);
  }
  return attachments;
}

/**
 * Converts a user message to OpenAI format with file attachment support
 */
function convertUserMessage(msg: any): ChatCompletionMessageParam {
  const msgContent: any[] = [];
  
  if (msg.content) {
    msgContent.push({
      type: 'text',
      text: msg.content,
    });
  }

  if (msg.file_attachments) {
    msgContent.push(...convertFileAttachments(msg.file_attachments));
  }

  return {
    role: 'user',
    content: msgContent.length > 0 ? msgContent : (msg.content || ''),
  } as any;
}

/**
 * Converts an assistant message with tool calls to OpenAI format
 */
function convertAssistantMessageWithTools(msg: any): ChatCompletionMessageParam {
  return {
    role: 'assistant',
    content: null,
    tool_calls: JSON.parse(msg.tool_calls),
  } as any;
}

/**
 * Converts a tool result message to OpenAI format
 */
function convertToolResultMessage(msg: any): ChatCompletionMessageParam {
  return {
    role: 'tool',
    content: msg.content,
    tool_call_id: msg.tool_call_id,
  } as any;
}

/**
 * Converts a single message from storage format to OpenAI format
 */
function convertMessage(msg: any): ChatCompletionMessageParam {
  if (msg.role === 'assistant' && msg.tool_calls) {
    return convertAssistantMessageWithTools(msg);
  }
  
  if (msg.role === 'tool' && msg.tool_call_id) {
    return convertToolResultMessage(msg);
  }

  if (msg.role === 'user') {
    return convertUserMessage(msg);
  }

  return {
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content || '',
  } as ChatCompletionMessageParam;
}

/**
 * Prepares the conversation messages with system prompt
 * Properly reconstructs tool call and tool result messages from stored data
 * Includes file attachments in user messages
 */
function prepareConversationMessages(
  model: string,
  history: any[],
  sop?: any,
  currentStepId?: string
): ChatCompletionMessageParam[] {
  const conversationMessages: ChatCompletionMessageParam[] = history.map(convertMessage);

  // Prepend system prompt
  const systemPrompt = createSystemPrompt(model, sop, currentStepId);
  conversationMessages.unshift({
    role: 'system',
    content: systemPrompt,
  } as ChatCompletionMessageParam);

  return conversationMessages;
}

/**
 * Loads SOP data for the current chat if active
 */
function loadActiveSOP(numChatId: number) {
  const sopRun = getActiveSOPRun(numChatId);
  let sop = undefined;
  if (sopRun) {
    sop = getSOP(sopRun.sopId);
  }
  return { sopRun, sop };
}

/**
 * Handles SOP step determination and updates
 */
async function determineAndUpdateStep(
  sop: any,
  currentStepId: string | undefined,
  sopRun: any,
  history: any[],
  isSOPStart: boolean,
  toolContext: ToolExecutionContext
) {
  let updatedStepId = currentStepId;
  let stepDecision: { stepId: string } | null = null;
  
  if (sop && currentStepId && !isSOPStart) {
    const currentStep = sop.steps.find((s: any) => s.id === currentStepId);
    if (currentStep) {
      try {
        stepDecision = await determineNextStep(history, currentStep, sop);
        
        // Update the step if it changed
        if (stepDecision.stepId !== currentStepId && sopRun) {
          updateSOPRunStep(sopRun.id, stepDecision.stepId);
          updatedStepId = stepDecision.stepId;
          toolContext.currentStepId = updatedStepId;
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`Step transition: ${sopRun.currentStepId} → ${stepDecision.stepId}`);
          }
        }
      } catch (error) {
        console.error('Error determining next step:', error);
      }
    }
  }
  
  return { stepDecision, updatedStepId };
}

/**
 * Saves tool-related messages to the database
 */
function saveChatMessages(
  numChatId: number,
  streamData: any,
  fullResponse: string
) {
  // Save tool messages to database when tools are executed
  if (streamData.type === 'tool' && streamData.messagesToSave) {
    for (const msg of streamData.messagesToSave) {
      if (msg.role === 'assistant' && 'tool_calls' in msg && msg.tool_calls) {
        saveToolCallMessage(numChatId, msg.tool_calls);
      } else if (msg.role === 'tool' && 'tool_call_id' in msg && msg.tool_call_id) {
        saveToolResultMessage(numChatId, msg.tool_call_id, msg.content, streamData.name, streamData.metadata);
      }
    }
  }

  // Save response when stream is done
  if (streamData.type === 'done' && fullResponse) {
    saveMessage(numChatId, 'assistant', fullResponse);
  }
}

/**
 * Gets the list of available tools
 */
function getAvailableTools() {
  return [writeDocumentTool, displaySOPTool, proposeSOPEditsTool, overwriteSOPTool, createSOPTool, deleteSOPTool];
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

    // Load active SOP if one exists
    const { sopRun, sop } = loadActiveSOP(numChatId);

    // Check if this is an initial SOP start command
    const isSOPStart = isInitialSOPStart(message);
    
    // Save user message only if it's not a system command
    if (!isSOPStart) {
      saveMessage(numChatId, 'user', message, files);
    }

    // Get conversation history
    const history = getMessages(numChatId);

    // Prepare tool execution context
    const toolContext: ToolExecutionContext = {
      chatId: numChatId,
      sop,
      sopRunId: sopRun?.id,
      currentStepId: sopRun?.currentStepId,
    };

    // Determine and update current step if needed
    const { stepDecision, updatedStepId } = await determineAndUpdateStep(
      sop,
      sopRun?.currentStepId,
      sopRun,
      history,
      isSOPStart,
      toolContext
    );

    // Recreate conversation messages with potentially updated step
    const updatedConversationMessages = prepareConversationMessages(model, history, sop, updatedStepId);

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
          for await (const streamData of handleChatStream(
            model,
            updatedConversationMessages,
            getAvailableTools(),
            toolContext
          )) {
            // Accumulate full response for saving
            if (streamData.type === 'content') {
              fullResponse += streamData.content || '';
            }

            // Save tool-related messages
            saveChatMessages(numChatId, streamData, fullResponse);

            // Send all stream data to client
            const data = JSON.stringify(streamData);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
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


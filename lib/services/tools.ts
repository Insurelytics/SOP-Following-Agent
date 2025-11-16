/**
 * Tool execution service
 * Handles parsing, validation, and execution of AI-called tools
 */

import { executeTool as executeToolFromOpenAI } from '@/lib/openai';
import { updateSOPRunStep, saveAIGeneratedDocument } from '@/lib/db';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { SOP, SOPStep } from '@/lib/types/sop';

/**
 * Default tools provided to non-SOP chats
 */
export const DEFAULT_TOOLS: string[] = [];

/**
 * Gets the list of tools available for a given context
 * If a SOP is provided, returns its providedTools, otherwise returns DEFAULT_TOOLS
 */
export function getAvailableTools(sop?: SOP): string[] {
  if (sop && sop.providedTools) {
    return sop.providedTools;
  }
  return DEFAULT_TOOLS;
}

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
  metadata?: Record<string, any>; // Extensible metadata for the tool result
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
 * Executes the display_sop_to_user tool
 * Retrieves and returns a SOP for display
 */
function executeDisplaySOPTool(sopId: string): { result: any; metadata: Record<string, any> } {
  try {
    const { getSOP } = require('@/lib/db');
    const sop = getSOP(sopId);
    
    if (!sop) {
      return {
        result: `Error: SOP with ID "${sopId}" not found in the database. Please verify the SOP ID is correct (e.g., "pdf-summary", "content-plan", "sop-management") and try again immediately with the correct ID.`,
        metadata: {},
      };
    }

    return {
      result: sop,
      metadata: {
        sopId: sop.id,
        displayName: sop.displayName,
      },
    };
  } catch (error) {
    return {
      result: `Error retrieving SOP: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again immediately with the same SOP ID - this may be a temporary issue.`,
      metadata: {},
    };
  }
}

/**
 * Validates SOP structure and returns validation errors if any
 */
function validateSOPStructure(sop: any): string[] {
  const errors: string[] = [];

  if (!sop || typeof sop !== 'object') {
    errors.push('SOP must be a valid JSON object. Ensure you\'re passing the complete SOP from display_sop_to_user, not a string or partial object. Try again immediately with the full SOP object.');
    return errors;
  }

  if (!sop.id || typeof sop.id !== 'string') {
    errors.push('SOP must have a valid id field (string in kebab-case like "my-sop"). Ensure the SOP object includes the id field. Try again immediately with a corrected SOP.');
  }

  if (!sop.name || typeof sop.name !== 'string') {
    errors.push('SOP must have a valid name field (string in snake_case like "my_sop"). Ensure the SOP object includes the name field. Try again immediately with a corrected SOP.');
  }

  if (!sop.displayName || typeof sop.displayName !== 'string') {
    errors.push('SOP must have a valid displayName field (human-readable string like "My SOP"). Ensure the SOP object includes the displayName field. Try again immediately with a corrected SOP.');
  }

  if (!sop.steps || !Array.isArray(sop.steps) || sop.steps.length === 0) {
    errors.push('SOP must have a steps array with at least one step. Every SOP needs at least one step with id, stepNumber, assistantFacingTitle, and description. Try again immediately with at least one step defined.');
  } else {
    // Validate steps
    const stepIds = new Set<string>();
    for (const step of sop.steps) {
      if (!step.id || typeof step.id !== 'string') {
        errors.push(`Step is missing a valid id field (should be kebab-case like "step-1"). Ensure every step has a unique id. Try again immediately with corrected step IDs.`);
      } else if (stepIds.has(step.id)) {
        errors.push(`Duplicate step id found: "${step.id}". Each step must have a unique id. Try again immediately with unique step IDs.`);
      } else {
        stepIds.add(step.id);
      }

      if (typeof step.stepNumber !== 'number') {
        errors.push(`Step "${step.id || '?'}" must have a numeric stepNumber field (e.g., 1, 2, 3). Try again immediately with numeric stepNumbers for all steps.`);
      }
    }
  }

  return errors;
}

/**
 * Executes the propose_sop_edits tool
 * Validates and returns proposed edits without saving
 */
function executeProposeSOPEditsTool(modifiedSOPString: string): { result: any; metadata: Record<string, any> } {
  try {
    if (!modifiedSOPString) {
      console.log('modifiedSOP is missing');
      return {
        result: `Error: modifiedSOP parameter is missing or empty. Pass the complete SOP as a JSON string. Try again immediately with the full SOP JSON.`,
        metadata: {},
      };
    }

    let modifiedSOP: any;
    try {
      modifiedSOP = JSON.parse(modifiedSOPString);
    } catch (parseError) {
      return {
        result: `Error: Could not parse modifiedSOP as JSON. Ensure it's valid JSON. Try again immediately with properly formatted JSON.`,
        metadata: {},
      };
    }

    const validationErrors = validateSOPStructure(modifiedSOP);
    console.log('validationErrors:', validationErrors);
    if (validationErrors.length > 0) {
      return {
        result: `Validation failed - the SOP structure has issues. Errors:\n${validationErrors.join('\n')}\n\nReview these errors and try again immediately with a corrected SOP object.`,
        metadata: {
          valid: false,
          errors: validationErrors,
        },
      };
    }

    // Update the timestamp
    modifiedSOP.updatedAt = new Date().toISOString();
    console.log('modifiedSOP:', modifiedSOP);
    return {
      result: modifiedSOP,
      metadata: {
        valid: true,
        sopId: modifiedSOP.id,
        displayName: modifiedSOP.displayName,
      },
    };
  } catch (error) {
    console.log('error:', error);
    return {
      result: `Error validating SOP edits: ${error instanceof Error ? error.message : 'Unknown error'}.`,
      metadata: {},
    };
  }
}

/**
 * Executes the overwrite_sop tool
 * Applies approved edits and saves to database
 */
function executeOverwriteSOPTool(modifiedSOPString: string): { result: string; metadata: Record<string, any> } {
  try {
    if (!modifiedSOPString) {
      return {
        result: `Error: modifiedSOP parameter is missing or empty. Pass the complete SOP as a JSON string. Try again immediately with the full SOP JSON.`,
        metadata: {},
      };
    }

    let modifiedSOP: any;
    try {
      modifiedSOP = JSON.parse(modifiedSOPString);
    } catch (parseError) {
      return {
        result: `Error: Could not parse modifiedSOP as JSON. Ensure it's valid JSON. Try again immediately with properly formatted JSON.`,
        metadata: {},
      };
    }

    const validationErrors = validateSOPStructure(modifiedSOP);

    if (validationErrors.length > 0) {
      return {
        result: `Cannot save SOP - validation failed. Errors:\n${validationErrors.join('\n')}\n\nReview these errors and try again immediately with a corrected SOP object.`,
        metadata: {
          valid: false,
          errors: validationErrors,
        },
      };
    }

    const { saveSOP } = require('@/lib/db');
    
    // Ensure timestamps are set
    modifiedSOP.updatedAt = new Date().toISOString();
    if (!modifiedSOP.createdAt) {
      modifiedSOP.createdAt = new Date().toISOString();
    }

    saveSOP(modifiedSOP);

    return {
      result: `Successfully updated SOP "${modifiedSOP.displayName}" (ID: ${modifiedSOP.id}). The changes have been saved to the database.`,
      metadata: {
        sopId: modifiedSOP.id,
        displayName: modifiedSOP.displayName,
        updatedAt: modifiedSOP.updatedAt,
      },
    };
  } catch (error) {
    return {
      result: `Error saving SOP: ${error instanceof Error ? error.message : 'Unknown error'}. This may be a temporary database issue. Try again immediately with the same SOP object.`,
      metadata: {},
    };
  }
}

/**
 * Executes the create_sop tool
 * Creates a new SOP and saves to database
 */
function executeCreateSOPTool(newSOPString: string): { result: string; metadata: Record<string, any> } {
  try {
    if (!newSOPString) {
      return {
        result: `Error: newSOP parameter is missing or empty. Pass the complete new SOP as a JSON string with all required fields. Try again immediately with the full SOP JSON.`,
        metadata: {},
      };
    }

    let newSOP: any;
    try {
      newSOP = JSON.parse(newSOPString);
    } catch (parseError) {
      return {
        result: `Error: Could not parse newSOP as JSON. Ensure it's valid JSON. Try again immediately with properly formatted JSON.`,
        metadata: {},
      };
    }

    const validationErrors = validateSOPStructure(newSOP);

    if (validationErrors.length > 0) {
      return {
        result: `Cannot create SOP - validation failed. Errors:\n${validationErrors.join('\n')}\n\nReview these errors and try again immediately with a corrected SOP object.`,
        metadata: {
          valid: false,
          errors: validationErrors,
        },
      };
    }

    const { getSOP, saveSOP } = require('@/lib/db');

    // Check if SOP with this ID already exists
    const existing = getSOP(newSOP.id);
    if (existing) {
      return {
        result: `Error: A SOP with ID "${newSOP.id}" already exists in the database. Choose a different, unique ID (e.g., "${newSOP.id}-v2") for this new SOP, or use overwrite_sop if you want to update the existing SOP instead. Try again immediately with a unique ID.`,
        metadata: {},
      };
    }

    // Set timestamps
    const now = new Date().toISOString();
    newSOP.createdAt = now;
    newSOP.updatedAt = now;

    saveSOP(newSOP);

    return {
      result: `Successfully created new SOP "${newSOP.displayName}" (ID: ${newSOP.id}). The new SOP has been saved to the database and is now available for use.`,
      metadata: {
        sopId: newSOP.id,
        displayName: newSOP.displayName,
        createdAt: newSOP.createdAt,
      },
    };
  } catch (error) {
    return {
      result: `Error creating SOP: ${error instanceof Error ? error.message : 'Unknown error'}. This may be a temporary database issue. Try again immediately with the same SOP object.`,
      metadata: {},
    };
  }
}

/**
 * Executes the delete_sop tool
 * Deletes a SOP from the database (prevents deletion of built-in SOPs)
 */
function executeDeleteSOPTool(sopId: string): { result: string; metadata: Record<string, any> } {
  try {
    // List of built-in SOPs that cannot be deleted
    const builtInSOPs = ['pdf-summary', 'content-plan', 'sop-management'];

    if (builtInSOPs.includes(sopId)) {
      return {
        result: `Error: Cannot delete built-in SOP "${sopId}". Built-in SOPs (pdf-summary, content-plan, sop-management) are protected and cannot be deleted. Only custom user-created SOPs can be deleted.`,
        metadata: {},
      };
    }

    const { getSOP, deleteSOP } = require('@/lib/db');

    // Check if SOP exists
    const sop = getSOP(sopId);
    if (!sop) {
      return {
        result: `Error: SOP with ID "${sopId}" not found in the database. Please verify the SOP ID is correct and try again immediately.`,
        metadata: {},
      };
    }

    deleteSOP(sopId);

    return {
      result: `Successfully deleted SOP "${sop.displayName}" (ID: ${sopId}). This action cannot be undone. The SOP has been permanently removed from the database.`,
      metadata: {
        sopId: sopId,
        displayName: sop.displayName,
      },
    };
  } catch (error) {
    return {
      result: `Error deleting SOP: ${error instanceof Error ? error.message : 'Unknown error'}. This may be a temporary database issue. Try again immediately with the same SOP ID.`,
      metadata: {},
    };
  }
}

/**
 * Executes the write_document tool
 * Returns result and metadata for document tracking
 */
function executeWriteDocumentTool(stepId: string, documentName: string, content: string, context?: ToolExecutionContext): { result: string; metadata: Record<string, any> } {
  if (!context?.sop) {
    return {
      result: 'Error: No active SOP found for this chat',
      metadata: {},
    };
  }

  // Find the step
  const step = findStepById(context.sop, stepId);
  if (!step) {
    return {
      result: `Error: Step "${stepId}" not found in SOP`,
      metadata: {},
    };
  }

  try {
    // Save document to database
    const savedDoc = saveAIGeneratedDocument(
      context.chatId,
      documentName,
      content,
      context.sopRunId
    );

    // Print the document to console
    console.log('\n' + '='.repeat(80));
    console.log(`DOCUMENT OUTPUT FOR STEP: ${step.assistantFacingTitle}`);
    console.log(`Document Name: ${documentName}`);
    console.log('='.repeat(80));
    console.log(content);
    console.log('='.repeat(80) + '\n');

    return {
      result: `Document "${documentName}" has been saved and displayed to the user! (ID: ${savedDoc.id})`,
      metadata: {
        documentName,
        documentId: savedDoc.id,
      },
    };
  } catch (error) {
    console.error('Error saving document:', error);
    return {
      result: `Error saving document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {},
    };
  }
}

/**
 * Executes a single tool call and returns the result with metadata
 */
export function executeSingleTool(toolCall: ToolCall, context?: ToolExecutionContext): ToolExecutionResult {
  try {
    const args = JSON.parse(toolCall.function.arguments);
    let result: any;
    let metadata: Record<string, any> | undefined;

    // Debug logging for SOP management tools
    if (toolCall.function.name.includes('sop')) {
      console.log(`Tool called: ${toolCall.function.name}, args keys:`, Object.keys(args));
    }

    if (toolCall.function.name === 'write_document') {
      const toolResult = executeWriteDocumentTool(args.stepId, args.documentName, args.content, context);
      result = toolResult.result;
      metadata = toolResult.metadata;
    } else if (toolCall.function.name === 'display_sop_to_user') {
      const toolResult = executeDisplaySOPTool(args.sopId);
      result = toolResult.result;
      metadata = toolResult.metadata;
    } else if (toolCall.function.name === 'propose_sop_edits') {
      const toolResult = executeProposeSOPEditsTool(args.modifiedSOP);  // args.modifiedSOP is a JSON string
      result = toolResult.result;
      metadata = toolResult.metadata;
    } else if (toolCall.function.name === 'overwrite_sop') {
      const toolResult = executeOverwriteSOPTool(args.modifiedSOP);  // args.modifiedSOP is a JSON string
      result = toolResult.result;
      metadata = toolResult.metadata;
    } else if (toolCall.function.name === 'create_sop') {
      const toolResult = executeCreateSOPTool(args.newSOP);  // args.newSOP is a JSON string
      result = toolResult.result;
      metadata = toolResult.metadata;
    } else if (toolCall.function.name === 'delete_sop') {
      const toolResult = executeDeleteSOPTool(args.sopId);
      result = toolResult.result;
      metadata = toolResult.metadata;
    } else {
      result = executeToolFromOpenAI(toolCall.function.name, args);
    }

    return {
      toolCall,
      args,
      result,
      metadata,
    };
  } catch (error) {
    return {
      toolCall,
      args: {},
      result: `Unexpected error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
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


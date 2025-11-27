/**
 * OpenAI client and tool configuration
 * Handles initialization, tool definitions, and tool execution
 */

import OpenAI from 'openai';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

// ============================================================================
// Client Initialization
// ============================================================================

/**
 * OpenAI API client instance
 * Configured with API key from environment
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Model Configuration
// ============================================================================

/**
 * Get model from environment variable, default to gpt-5-nano
 */
export const DEFAULT_MODEL = process.env.MODEL || 'gpt-5-nano';

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Write document tool for SOP workflows
 * Allows the AI to write and display a formatted document
 */
export const writeDocumentTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'write_document',
    description: 'Writes a formatted document for the current SOP step. The document is validated against the step requirements and displayed to the user automatically.',
    parameters: {
      type: 'object',
      properties: {
        stepId: {
          type: 'string',
          description: 'The ID of the current SOP step',
        },
        documentName: {
          type: 'string',
          description: 'The name/title of the document being written',
        },
        content: {
          type: 'string',
          description: 'The document content to write',
        },
      },
      required: ['stepId', 'documentName', 'content'],
    },
  },
};

/**
 * Display SOP to user tool for SOP management (template)
 * Retrieves and displays an existing SOP
 * Use getDisplaySOPTool() to get a version with actual SOP IDs
 */
export const displaySOPTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'display_sop_to_user',
    description: 'Retrieves and displays an existing SOP to the user. This tool returns the complete SOP JSON object that you can then modify and pass to overwrite_sop. Use this first when you need to edit or review an existing SOP.',
    parameters: {
      type: 'object',
      properties: {
        sopId: {
          type: 'string',
          description: 'The unique ID of the SOP to retrieve',
        },
      },
      required: ['sopId'],
    },
  },
};

/**
 * Overwrite SOP tool for SOP management
 * Applies approved edits and saves the modified SOP to the database
 */
export const overwriteSOPTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'overwrite_sop',
    description: 'Saves approved changes to database. Accepts the full edited SOP as a JSON string. Get user approval before calling this tool.',
    parameters: {
      type: 'object',
      properties: {
        modifiedSOP: {
          type: 'string',
          description: 'REQUIRED: The complete modified SOP as a JSON string with all fields',
        },
      },
      required: ['modifiedSOP'],
    },
  },
};

/**
 * Create SOP tool for SOP management
 * Creates a new SOP and saves it to the database
 */
export const createSOPTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'create_sop',
    description: 'Creates and saves new SOP to database. Accepts the full new SOP as a JSON string. Get user approval before calling this tool.',
    parameters: {
      type: 'object',
      properties: {
        newSOP: {
          type: 'string',
          description: 'REQUIRED: Complete new SOP as a JSON string with all fields (id, name, displayName, description, version, generalInstructions, steps, assistantOutputFormats, providedTools, userDocuments)',
        },
      },
      required: ['newSOP'],
    },
  },
};

/**
 * Delete SOP tool for SOP management (template)
 * Deletes a SOP from the system (prevents deletion of built-in SOPs)
 * Use getDeleteSOPTool() to get a version with actual SOP IDs
 */
export const deleteSOPTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'delete_sop',
    description: 'Deletes a SOP from the system and cannot be undone. Built-in SOPs are protected and cannot be deleted. Only call this when the user explicitly requests deletion of a custom SOP they created.',
    parameters: {
      type: 'object',
      properties: {
        sopId: {
          type: 'string',
          description: 'The ID of the SOP to delete',
        },
      },
      required: ['sopId'],
    },
  },
};

// ============================================================================
// Dynamic Tool Generation (with actual SOP IDs from database)
// ============================================================================

/**
 * Creates a tool definition with dynamic SOP ID descriptions
 * Injects real SOP IDs from the database into tool descriptions
 */
export function getSopManagementTools(): ChatCompletionTool[] {
  let displaySOPToolDynamic = JSON.parse(JSON.stringify(displaySOPTool)) as ChatCompletionTool;
  let deleteSOPToolDynamic = JSON.parse(JSON.stringify(deleteSOPTool)) as ChatCompletionTool;

  try {
    const { generateDynamicToolDescriptions } = require('@/lib/services/tools');
    const descriptions = generateDynamicToolDescriptions();
    
    // Update descriptions with actual SOP IDs
    displaySOPToolDynamic.function.description = descriptions.displaySOPDescription;
    deleteSOPToolDynamic.function.description = descriptions.deleteSOPDescription;
  } catch (error) {
    console.warn('Could not generate dynamic tool descriptions, using defaults:', error);
  }

  return [displaySOPToolDynamic, deleteSOPToolDynamic];
}

/**
 * Gets all SOP management tools with dynamic descriptions
 * This includes: display_sop_to_user, overwrite_sop, create_sop, delete_sop
 */
export function getAllSopManagementTools(): ChatCompletionTool[] {
  const sopTools = getSopManagementTools();
  return [
    ...sopTools,
    overwriteSOPTool,
    createSOPTool,
  ];
}

// ============================================================================
// Tool Implementations
// ============================================================================

/**
 * Dispatcher to execute any tool by name
 * @param toolName - Name of the tool to execute
 * @param args - Arguments to pass to the tool
 * @returns Result of tool execution
 * @throws Error if tool name is unknown
 */
export function executeTool(toolName: string, args: any): any {
  // All tool implementations are in lib/services/tools.ts
  // This function is kept for potential future simple tools
  throw new Error(`Unknown tool: ${toolName}`);
}

// ============================================================================
// Types
// ============================================================================

/**
 * Type for conversation messages with tool support
 */
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

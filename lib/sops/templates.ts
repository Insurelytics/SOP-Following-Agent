/**
 * Default SOP Templates
 * These are pre-defined SOPs that users can run
 */

import type { SOP } from '../types/sop';

/**
 * Simple test SOP: PDF Summary Creator
 * User provides text, AI generates a formatted summary of it
 */
export const SOPManagementSOP: SOP = {
  id: 'sop-management',
  name: 'sop-management',
  displayName: 'SOP Management',
  description: 'Manage SOPs for users',
  version: '1.0.0',

  generalInstructions: 'You are a helpful assistant that creates and/or edits SOPs for users. Your job is to help the user create and/or edit SOPs for their workflows.',

  userDocuments: [],
  assistantOutputFormats: [
    {
      id: 'sop-format',
      name: 'SOP JSON Structure',
      template: `{
  "id": "unique-identifier",
  "name": "internal_name",
  "displayName": "Display Name",
  "description": "Brief description of the SOP",
  "version": "1.0.0",
  "generalInstructions": "Instructions for the AI about this SOP's purpose",
  "userDocuments": [
    {
      "id": "document_id",
      "name": "Document Name",
      "description": "What this document is for",
      "type": "text" | "file",
      "required": true
    }
  ],
  "assistantOutputFormats": [
    {
      "id": "format_id",
      "name": "Format Name",
      "template": "Template structure or example",
      "requirements": ["Requirement 1", "Requirement 2"]
    }
  ],
  "steps": [
    {
      "id": "step_id",
      "stepNumber": 1,
      "assistantFacingTitle": "Title for AI",
      "userFacingTitle": "Title for user",
      "description": "What the AI should do at this step",
      "referencedDocuments": ["document_id"],
      "expectedOutput": {
        "type": "text" | "html-document" | "structured" | "conversation",
        "format": "format_id",
        "description": "What output is expected"
      },
      "nextStep": "next_step_id" | ["step_id_1", "step_id_2"] | "DONE"
    }
  ],
  "providedTools": ["tool_name_1", "tool_name_2"],
  "createdAt": "ISO date string",
  "updatedAt": "ISO date string"
}`,
      requirements: [
        'id must be unique and kebab-case',
        'name must be snake_case',
        'displayName should be human-readable',
        'steps must be an array with at least one step',
        'Each step must have a unique id and stepNumber',
        'nextStep can be a single step id, array of step ids for branching, or "DONE"',
        'dates must be ISO 8601 format',
      ],
    }
  ],
  providedTools: ['write_document', 'display_sop_to_user', 'overwrite_sop', 'create_sop', 'delete_sop'],
  steps: [
    {
      id: 'step-1-determine-goal',
      stepNumber: 1,
      assistantFacingTitle: 'Determine Goal',
      userFacingTitle: 'Set Goal',
      description: 'Ask the user whether they want to create a new SOP or edit an existing one, and for the name of the SOP to edit/create.',
      referencedDocuments: [],
      expectedOutput: {
        type: 'text',
        format: undefined,
        description: 'A request to the user to confirm whether they want to create a new SOP or edit an existing one, and for the name of the SOP to edit/create.',
      },
      nextStep: ['clarify-edits', 'clarify-new'],
    },
    {
      id: 'clarify-edits',
      stepNumber: 2,
      assistantFacingTitle: 'Clarify Edits',
      userFacingTitle: 'Clarify Edits',
      description: 'Call display_sop_to_user with the SOP ID to retrieve the complete SOP JSON object. You will receive the full structure including steps, assistantOutputFormats, userDocuments, etc. Use this to understand the SOP and reference it in your conversation with the user, but do NOT repeat the entire JSON back to them. Ask specifically which part they want to modify (e.g., "add a step", "modify the summary format", "add a new output format") and how they want it changed. Keep your response focused on conversational guidance, not technical details.',
      referencedDocuments: [],
      expectedOutput: {
        type: 'text',
        format: undefined,
        description: 'A clear question asking the user to specify which SOP component they want to change and how.',
      },
      nextStep: 'propose-edits',
    },
    {
      id: 'propose-edits',
      stepNumber: 3,
      assistantFacingTitle: 'Propose Edits',
      userFacingTitle: 'Review Edits',
      description: 'Take the SOP object from display_sop_to_user and modify ONLY the specific fields the user requested (e.g., modify assistantOutputFormats[0].template for output format changes, or steps[i].description for step changes). Keep all other fields unchanged. Increment the patch version (e.g., 1.0.0 → 1.0.1). Call propose_sop_edits with the complete modified SOP object. This tool will validate the structure and return the modified SOP for the user to review. If validation fails, fix the issues and try again immediately. Get user approval before advancing.',
      referencedDocuments: [],
      expectedOutput: {
        type: 'text',
        format: 'sop-format',
        description: 'The modified SOP object and a brief message explaining the changes.',
      },
      nextStep: 'apply-edits',
    },
    {
      id: 'apply-edits',
      stepNumber: 4,
      assistantFacingTitle: 'Apply Edits',
      userFacingTitle: 'Apply Edits',
      description: 'Call overwrite_sop with the same SOP object that the user just approved from the propose-edits step. Pass the sopId and the complete modified SOP. The tool will validate once more, update the updatedAt timestamp, and save to the database. If it succeeds, confirm to the user that the changes have been applied. If it fails, review the error message and try again immediately.',
      referencedDocuments: [],
      expectedOutput: {
        type: 'text',
        format: undefined,
        description: 'A confirmation message to the user that the edits have been permanently saved.',
      },
      nextStep: 'DONE',
    },
    {
      id: 'clarify-new',
      stepNumber: 5,
      assistantFacingTitle: 'Clarify New SOP',
      userFacingTitle: 'Clarify New SOP',
      description: 'Ask the user what workflow or process they want to create a SOP for. Ask them to describe the goal, the steps involved, any inputs or documents needed, and what the expected output should be. Help them think through the workflow in a structured way.',
      referencedDocuments: [],
      expectedOutput: {
        type: 'text',
        format: undefined,
        description: 'A detailed question asking the user to describe their workflow, goals, steps, inputs, and expected outputs.',
      },
      nextStep: 'propose-new',
    },
    {
      id: 'propose-new',
      stepNumber: 6,
      assistantFacingTitle: 'Propose New SOP',
      userFacingTitle: 'Review New SOP',
      description: 'Create a complete new SOP structure based on the user\'s description. Use propose_sop_edits (not create_sop yet) to validate and preview the new SOP structure for the user without saving it. Include all required fields: id (unique kebab-case), name (snake_case), displayName, description, version ("1.0.0"), generalInstructions, steps (array with at least 1 step), assistantOutputFormats, providedTools, and userDocuments. If validation passes, show the user the proposed SOP and get their approval. If validation fails, fix the issues and try again immediately.',
      referencedDocuments: [],
      expectedOutput: {
        type: 'text',
        format: 'sop-format',
        description: 'A new SOP JSON object and explanation of the proposed workflow structure.',
      },
      nextStep: 'apply-new',
    },
    {
      id: 'apply-new',
      stepNumber: 7,
      assistantFacingTitle: 'Apply New SOP',
      userFacingTitle: 'Create SOP',
      description: 'Call create_sop with the complete new SOP object that the user just approved from propose-new. Pass the newSOP parameter with all required fields intact. The tool will validate the structure, check that the ID is unique, and save to the database. If successful, confirm to the user that the new SOP has been created and is ready to use. If it fails (e.g., ID already exists), review the error and fix it, then try again immediately.',
      referencedDocuments: [],
      expectedOutput: {
        type: 'text',
        format: undefined,
        description: 'A confirmation message to the user that the new SOP has been created successfully.',
      },
      nextStep: 'DONE',
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const PDFSummarySOP: SOP = {
  id: 'pdf-summary',
  name: 'pdf_summary',
  displayName: 'PDF Summary',
  description: 'Upload or paste text and get a structured summary with key takeaways',
  version: '1.0.0',

  generalInstructions: 'You are helping a user distill large amounts of information into concise, actionable summaries. The user wants to quickly understand the main points and key takeaways without reading the entire document. Be thorough but concise, focusing on what matters most.',

  userDocuments: [
    {
      id: 'source_document',
      name: 'Source Document',
      description: 'The content to be summarized (paste text or upload file)',
      type: 'text' as unknown as 'text' | 'file',
      required: true,
    },
  ],

  assistantOutputFormats: [
    {
      id: 'pdf-summary',
      name: 'PDF Summary',
      template: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px;">
  <h2 style="color: #333; margin-top: 24px; margin-bottom: 12px;">Summary</h2>
  <p style="color: #666;">[2-3 sentences]</p>

  <h2 style="color: #333; margin-top: 24px; margin-bottom: 12px;">Main Topics</h2>
  <ul style="color: #666; margin: 12px 0;">
    <li>[key topic 1]</li>
    <li>[key topic 2]</li>
    <li>[key topic 3]</li>
    <li>[key topic 4]</li>
    <li>[key topic 5-7]</li>
  </ul>

  <h2 style="color: #333; margin-top: 24px; margin-bottom: 12px;">Key Takeaways</h2>
  <ul style="color: #666; margin: 12px 0;">
    <li>[takeaway 1]</li>
    <li>[takeaway 2]</li>
    <li>[takeaway 3-5]</li>
  </ul>
</div>`,
    requirements: [],
    },
  ],

  providedTools: ['write_document'],

  steps: [
    {
      id: 'get-document',
      stepNumber: 1,
      assistantFacingTitle: 'Get Document',
      userFacingTitle: 'Upload Document',
      description: 'Ask the user to provide the document content to summarize, and explain to them what to expect during this SOP.',
      referencedDocuments: [],

      expectedOutput: {
        type: 'text',
        format: undefined,
        description: 'A request to the user to provide the document content, along with a brief summary of what to expect during this SOP.',
      },

      nextStep: 'summarize-document',
    },

    {
      id: 'summarize-document',
      stepNumber: 2,
      assistantFacingTitle: 'Summarize Document',
      userFacingTitle: 'View Summary',
      description: 'Create a summary document of what the user provided.',
      referencedDocuments: ['source_document'],

      expectedOutput: {
        type: 'html-document',
        format: 'pdf-summary',
        description: 'A document and a brief message to the user about said document.',
      },

      nextStep: 'DONE',
    },
  ],

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Content Plan Creator SOP
 * Based on Nick's system for creating content plans using client onboarding docs and comp lists
 */
export const ContentPlanSOP: SOP = {
  id: 'content-plan',
  name: 'content_plan',
  displayName: 'Content Plan Creator',
  description: 'Create a monthly content plan (12 or 18 videos) for a personal brand',
  version: '1.0.0',

  generalInstructions: 'You are a content strategist working with an employee at a media agency (the user) to build an on-brand video content strategy. Your role is to analyze the given client\'s business, voice, and target audience alongside competitive research to create a content plan that drives engagement and sales. Be strategic but practical—balance variety with consistency, and ensure every recommendation aligns with both the client\'s goals and their audience\'s preferences.',

  userDocuments: [
    {
      id: 'client_onboarding',
      name: 'Client Onboarding Doc',
      description: 'Business info, offers, target audience, brand goals, signature frameworks (paste text or upload file)',
      type: 'text' as unknown as 'text' | 'file',
      required: true,
    },
    {
      id: 'comps_list',
      name: 'Comps List / 10x10',
      description: '5-10 accounts to emulate with notes on tone, topic, delivery (paste text or upload file)',
      type: 'text' as unknown as 'text' | 'file',
      required: true,
    },
  ],

  assistantOutputFormats: [
    {
      id: 'style-guide-ratio',
      name: 'Style Guide Ratio Doc',
      template: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 1000px;">
  <h2 style="color: #333; margin-bottom: 12px;">Key Takeaways</h2>
  <p style="color: #666; margin-bottom: 24px;">[summary]</p>

  <h3 style="color: #333; margin-top: 24px; margin-bottom: 16px;">[CLIENT NAME] - [Package Size]-Video Monthly Content Ratio</h3>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <thead>
      <tr style="background-color: #f0f0f0;">
        <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Content Style</th>
        <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">% of Monthly Output</th>
        <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;"># of Videos</th>
        <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Primary Purpose</th>
        <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Example Topics / Angles</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #ddd; padding: 12px;">[style 1]</td>
        <td style="border: 1px solid #ddd; padding: 12px;">[%]</td>
        <td style="border: 1px solid #ddd; padding: 12px;">[count]</td>
        <td style="border: 1px solid #ddd; padding: 12px;">[purpose]</td>
        <td style="border: 1px solid #ddd; padding: 12px;">[topics]</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 12px;">[style 2]</td>
        <td style="border: 1px solid #ddd; padding: 12px;">[%]</td>
        <td style="border: 1px solid #ddd; padding: 12px;">[count]</td>
        <td style="border: 1px solid #ddd; padding: 12px;">[purpose]</td>
        <td style="border: 1px solid #ddd; padding: 12px;">[topics]</td>
      </tr>
    </tbody>
  </table>
  <p style="color: #999; font-size: 12px; margin-top: 12px;">Styles include: Talking Head (authority), VO Storytelling, Tutorial/Framework, Vlog/Doc moments, Lists/Hacks, Text-on-Screen/Visual.</p>
</div>`,
      requirements: [
        'Styles include: Talking Head (authority), VO Storytelling, Tutorial/Framework, Vlog/Doc moments, Lists/Hacks, Text-on-Screen/Visual.',
      ],
    },
    {
      id: 'video-ideas-list',
      name: 'Video Ideas List',
      template: `<div style="font-family: Arial, sans-serif; line-height: 1.8; max-width: 800px;">
  <h2 style="color: #333; margin-bottom: 20px;">Video Concepts - Talking Head Ideas</h2>
  <ol style="color: #666; margin: 12px 0; padding-left: 24px;">
    <li style="margin-bottom: 12px;"><strong>[Video Title 1]</strong> - [One-line angle/hook]</li>
    <li style="margin-bottom: 12px;"><strong>[Video Title 2]</strong> - [One-line angle/hook]</li>
    <li style="margin-bottom: 12px;"><strong>[Video Title 3]</strong> - [One-line angle/hook]</li>
    <li style="margin-bottom: 12px;"><strong>[Video Title 4]</strong> - [One-line angle/hook]</li>
    <li style="margin-bottom: 12px;"><strong>[Video Title 5]</strong> - [One-line angle/hook]</li>
    <li style="margin-bottom: 12px;"><strong>[Video Title 6]</strong> - [One-line angle/hook]</li>
    <li style="margin-bottom: 12px;"><strong>[Video Title 7]</strong> - [One-line angle/hook]</li>
    <li style="margin-bottom: 12px;"><strong>[Video Title 8]</strong> - [One-line angle/hook]</li>
    <li style="margin-bottom: 12px;"><strong>[Video Title 9]</strong> - [One-line angle/hook]</li>
    <li style="margin-bottom: 12px;"><strong>[Video Title 10]</strong> - [One-line angle/hook]</li>
  </ol>
  <p style="color: #999; font-size: 12px; margin-top: 20px;"><em>Each idea reflects client brand, comp style, and target audience.</em></p>
</div>`,

      requirements: [
        'Each idea reflects client brand, comp style, and target audience.',
      ],
    },
    {
      id: 'script-format',
      name: 'Script Format',
      template: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 1000px;">
  <div style="background-color: #f9f9f9; border-left: 4px solid #4CAF50; padding: 16px; margin-bottom: 24px;">
    <h3 style="margin-top: 0; color: #333;">Key Information</h3>
    <ul style="list-style: none; padding: 0; color: #666;">
      <li style="margin-bottom: 8px;"><strong>Video Format:</strong> [type]</li>
      <li style="margin-bottom: 8px;"><strong>Inspiration Video:</strong> [real Instagram link]</li>
      <li style="margin-bottom: 8px;"><strong>Subtopic:</strong> [topic name]</li>
      <li style="margin-bottom: 8px;"><strong>Instructions:</strong> [filming guidance]</li>
    </ul>
  </div>

  <h3 style="color: #333; margin-top: 24px; margin-bottom: 12px;">Script</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background-color: #f0f0f0;">
        <th style="border: 1px solid #ddd; padding: 12px; text-align: left; width: 40%; font-weight: bold;">Notes and B-Roll</th>
        <th style="border: 1px solid #ddd; padding: 12px; text-align: left; width: 60%; font-weight: bold;">Script / Dialogue</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #ddd; padding: 12px; vertical-align: top; color: #666;">[filming notes and actions]</td>
        <td style="border: 1px solid #ddd; padding: 12px; vertical-align: top; color: #666;">[dialogue]</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 20px; padding: 12px; background-color: #fff3cd; border-radius: 4px; font-size: 12px; color: #666;">
    <p style="margin: 0;"><strong>Requirements:</strong> Script length ~1:15-1:30 | Conversational tone | No emojis | No dashes in dialogue</p>
  </div>
</div>`,
      requirements: [
        'Script length ~1:15-1:30 (judged assuming the speaker talks at a moderate pace)',
        'conversational tone',
        'no emojis',
        'no dashes in dialogue',
      ],
    }
  ],

  providedTools: ['write_document'],

  steps: [
    {
      id: 'step-1-gather-inputs',
      stepNumber: 1,
      assistantFacingTitle: 'Gather Client Info',
      userFacingTitle: 'Share Client Info',
      description: 'Ask the user for the client onboarding doc, comps list, and package size (12 or 18 videos). Explain what each will be used for.',
      referencedDocuments: [],
      expectedOutput: {
        type: 'text',
        format: undefined,
        description: `A request for three things:
1. Client Onboarding Doc (business info, offers, audience, brand goals, frameworks)
2. Comps List / 10x10 (5-10 accounts to emulate with style notes)
3. Package Size (12 or 18 videos)`,
      },

      nextStep: 'step-2-style-guide',
    },

    {
      id: 'step-2-style-guide',
      stepNumber: 2,
      assistantFacingTitle: 'Generate Style Guide Ratio',
      userFacingTitle: 'Review Content Strategy',
      description: 'Cross-reference the onboarding doc and comps list. Create a monthly content ratio showing content types, percentages, and video counts.  Afterwards, ask the user which style they want to start with.',
      referencedDocuments: ['client_onboarding', 'comps_list'],

      expectedOutput: {
        type: 'html-document',
        format: 'style-guide-ratio',
        description: 'A document and a brief message to the user about said document.',
      },

      nextStep: 'step-3-video-ideas',
    },

    {
      id: 'step-3-video-ideas',
      stepNumber: 3,
      assistantFacingTitle: 'Generate Video Ideas',
      userFacingTitle: 'Choose Video Concept',
      description: 'Generate 10 video concept ideas in [style] that align with the client brand, target audience, and comp accounts. List titles with one-line angles only. Afterwards, ask the user which idea they want to go with.',
      referencedDocuments: ['client_onboarding', 'comps_list'],

      expectedOutput: {
        type: 'text',
        format: 'video-ideas-list',
        description: 'Follows the format exactly',
      },

      nextStep: 'step-4-script-ideas',
    },

    {
      id: 'step-4-script-ideas',
      stepNumber: 4,
      assistantFacingTitle: 'Script Selected Ideas',
      userFacingTitle: 'Review Script',
      description: 'For the idea the user selects, write a full script in the 2-column format with Key Information block at the top.',
      referencedDocuments: ['client_onboarding', 'comps_list'],

      expectedOutput: {
        type: 'html-document',
        format: 'script-format',
        description: 'A document and a brief message to the user about the document.',
      },
      // Optional repeating pattern: user can choose to loop back to step 3 or complete
      nextStep: ['step-3-video-ideas', 'DONE'],
    }
  ],

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Get all default SOPs
 */
export function getDefaultSOPs(): SOP[] {
  return [SOPManagementSOP, PDFSummarySOP, ContentPlanSOP];
}

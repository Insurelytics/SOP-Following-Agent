/**
 * Default SOP Templates
 * These are pre-defined SOPs that users can run
 */

import type { SOP } from '../types/sop';

/**
 * Simple test SOP: PDF Summary Creator
 * User provides text, AI generates a formatted summary of it
 */
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
      template: `**Summary**
- [2-3 sentences]

**Main Topics**
- [bullet points list of 5-7 key topics]

**Key Takeaways**
- [3-5 bullet points]`,
    requirements: [],
    },
  ],

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
        type: 'markdown-document',
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
      template: `Key Takeaways
 [summary]
[CLIENT NAME] - [Package Size]-Video Monthly Content Ratio
 Content Style | % of Monthly Output | # of Videos ([Package Size] total) | Primary Purpose | Example Topics / Angles
`,
      requirements: [
        'Styles include: Talking Head (authority), VO Storytelling, Tutorial/Framework, Vlog/Doc moments, Lists/Hacks, Text-on-Screen/Visual.',
      ],
    },
    {
      id: 'video-ideas-list',
      name: 'Video Ideas List',
      template: `A numbered list of 10 talking head video ideas:
1. [Video Title] - [One-line angle/hook]
2. [Video Title] - [One-line angle/hook]
(etc.)`,

      requirements: [
        'Each idea reflects client brand, comp style, and target audience.',
      ],
    },
    {
      id: 'script-format',
      name: 'Script Format',
      template: `**Key Information:**
- Video Format: [type]
- Inspiration Video: [real Instagram link]
- Subtopic: [topic name]
- Instructions: [filming guidance]

**NOTES AND B-ROLL (LEFT) | SCRIPT (RIGHT)**
[Left column: filming notes and actions | Right column: dialogue]
`,
      requirements: [
        'Script length ~1:15-1:30 (judged assuming the speaker talks at a moderate pace)',
        'conversational tone',
        'no emojis',
        'no dashes in dialogue',
      ],
    }
  ],

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
        type: 'markdown-document',
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
        type: 'markdown-document',
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
  return [PDFSummarySOP, ContentPlanSOP];
}

/**
 * Chat naming service
 * Uses Instructor with a cheap model to generate a concise chat title
 * based on the conversation history and optional SOP context.
 */

import { z } from 'zod';
import createInstructor from '@instructor-ai/instructor';
import OpenAI from 'openai';
import type { SOP } from '@/lib/types/sop';

// Schema for the generated chat title
const ChatTitleSchema = z.object({
  title: z
    .string()
    .min(1, 'Title must not be empty')
    .max(80, 'Title must be at most 80 characters'),
});

/**
 * Generate a chat title from conversation history and optional SOP context.
 * Uses a cheap model via Instructor, mirroring other small AI helper flows.
 *
 * @param history - Conversation messages in storage format (role/content)
 * @param sop - Optional SOP associated with the chat
 * @returns A generated title string or null on failure
 */
export async function generateChatTitleFromHistory(
  history: Array<{ role: string; content: string | null }>,
  sop?: SOP | null
): Promise<string | null> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY is not set; skipping chat title generation.');
      return null;
    }

    // Initialize Instructor with OpenAI using the cheap model
    const client = createInstructor({
      client: new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      }),
      mode: 'TOOLS',
    });

    // Use a recent window of conversation for naming
    const recentMessages = history
      .filter((m) => m.content && (m.role === 'user' || m.role === 'assistant'))
      .slice(-10);

    const conversationSummary =
      recentMessages.length > 0
        ? recentMessages
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n')
        : '(no messages yet)';

    const sopContext = sop
      ? `\n\nThe user is currently following this SOP:\n- Name: ${sop.displayName}\n- ID: ${sop.id}\n- Description: ${sop.description}`
      : '';

    const prompt = `You are a helper that writes concise, human-friendly chat titles for a sidebar list.

Conversation so far:
${conversationSummary}
${sopContext}

Rules:
- Respond with a short descriptive chat title.
- Maximum 60 characters, ideally 3–8 words.
- Use sentence case (capitalize only the first word and proper nouns).
- Do NOT include quotation marks around the title.
- Do NOT include step numbers or SOP IDs unless they are essential.`;

    const result = await client.chat.completions.create({
      model: process.env.CHEAP_MODEL || 'gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_model: {
        schema: ChatTitleSchema,
        name: 'ChatTitle',
      },
    });

    const title = (result as any).title as string | undefined;
    if (!title) {
      return null;
    }

    return title.trim();
  } catch (error) {
    console.error('Error generating chat title:', error);
    return null;
  }
}



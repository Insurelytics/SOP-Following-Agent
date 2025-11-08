import { NextRequest, NextResponse } from 'next/server';
import { getMessages } from '@/lib/db';

/**
 * Extracts and validates the chatId from query parameters
 */
function extractChatId(request: NextRequest): { valid: boolean; chatId?: number; error?: string } {
  const searchParams = request.nextUrl.searchParams;
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return { valid: false, error: 'chatId is required' };
  }

  const parsedId = parseInt(chatId);
  if (isNaN(parsedId)) {
    return { valid: false, error: 'chatId must be a valid number' };
  }

  return { valid: true, chatId: parsedId };
}

/**
 * GET /api/messages?chatId=X - Get all messages for a chat
 * Returns messages ordered by creation date
 */
export async function GET(request: NextRequest) {
  try {
    const extraction = extractChatId(request);

    if (!extraction.valid) {
      return NextResponse.json({ error: extraction.error }, { status: 400 });
    }

    const messages = getMessages(extraction.chatId!);
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}


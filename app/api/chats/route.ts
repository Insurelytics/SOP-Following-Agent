import { NextRequest, NextResponse } from 'next/server';
import { getUserChats, createNewChat } from '@/lib/services/chat';

const DEFAULT_USERNAME = 'dev-test';

/**
 * GET /api/chats - Get all chats for the current user
 * Returns an array of chats ordered by creation date
 */
export async function GET() {
  try {
    const chats = getUserChats(DEFAULT_USERNAME);
    return NextResponse.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    // Return empty array on error to prevent client-side crashes
    return NextResponse.json([]);
  }
}

/**
 * POST /api/chats - Create a new chat for the current user
 * Returns the newly created chat object
 */
export async function POST(request: NextRequest) {
  try {
    const chat = createNewChat(DEFAULT_USERNAME);
    return NextResponse.json(chat, { status: 201 });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}


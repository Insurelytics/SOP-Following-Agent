import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateUser,
  createChat,
  getChatsForUser,
} from '@/lib/db';
import { DEFAULT_MODEL } from '@/lib/openai';

// GET /api/chats - Get all chats for dev-test user
export async function GET() {
  try {
    const user = getOrCreateUser('dev-test');
    const chats = getChatsForUser(user.id);
    
    // Ensure chats is always an array
    return NextResponse.json(Array.isArray(chats) ? chats : []);
  } catch (error) {
    console.error('Error fetching chats:', error);
    // Return empty array on error to prevent client-side crashes
    return NextResponse.json([]);
  }
}

// POST /api/chats - Create a new chat
export async function POST(request: NextRequest) {
  try {
    const user = getOrCreateUser('dev-test');
    const chat = createChat(user.id, DEFAULT_MODEL);
    
    return NextResponse.json(chat, { status: 201 });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    );
  }
}


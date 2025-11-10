import { NextRequest, NextResponse } from 'next/server';
import { getLatestSOPRun } from '@/lib/db';

/**
 * GET /api/chats/[chatId]/run - Get the latest SOP run for a chat
 * Returns the SOP run data if it exists, or null if no run is associated
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const chatId = parseInt(params.chatId, 10);
    
    if (isNaN(chatId)) {
      return NextResponse.json({ error: 'Invalid chat ID' }, { status: 400 });
    }

    // Get the most recent SOP run for this chat
    const sopRun = getLatestSOPRun(chatId);
    
    if (!sopRun) {
      // No SOP run exists for this chat
      return NextResponse.json(null);
    }

    return NextResponse.json(sopRun);
  } catch (error) {
    console.error('Error fetching chat run:', error);
    return NextResponse.json(null, { status: 500 });
  }
}


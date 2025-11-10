import { NextRequest, NextResponse } from 'next/server';
import { getLatestSOPRun, getSOP } from '@/lib/db';

/**
 * GET /api/chats/[chatId]/sop - Get the active SOP for a chat
 * Returns the SOP data if a run exists, or null if no SOP is associated
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

    // Get the SOP details
    const sop = getSOP(sopRun.sopId);
    
    if (!sop) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      sop,
      run: sopRun,
    });
  } catch (error) {
    console.error('Error fetching chat SOP:', error);
    return NextResponse.json(null, { status: 500 });
  }
}


import { NextResponse, NextRequest } from 'next/server';
import { getSOPDrafts } from '@/lib/db';

/**
 * GET /api/sop-drafts - Get all SOP drafts for a chat
 * Query params: chatId (required)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    const drafts = getSOPDrafts(parseInt(chatId, 10));
    return NextResponse.json(drafts);
  } catch (error) {
    console.error('Error fetching SOP drafts:', error);
    return NextResponse.json([], { status: 500 });
  }
}


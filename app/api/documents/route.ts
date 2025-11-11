import { NextRequest } from 'next/server';
import { getAIGeneratedDocuments, getAIGeneratedDocument } from '@/lib/db';

/**
 * GET /api/documents - Fetch AI-generated documents for a chat
 * Query params: chatId (required), documentId (optional - for fetching specific document)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get('chatId');
    const documentId = searchParams.get('documentId');

    if (!chatId) {
      return new Response(JSON.stringify({ error: 'chatId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const numChatId = Number(chatId);

    // Fetch specific document if documentId is provided
    if (documentId) {
      const numDocumentId = Number(documentId);
      const document = getAIGeneratedDocument(numDocumentId);

      if (!document) {
        return new Response(JSON.stringify({ error: 'Document not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Verify document belongs to this chat
      if (document.chat_id !== numChatId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(document), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch all documents for the chat
    const documents = getAIGeneratedDocuments(numChatId);
    return new Response(JSON.stringify(documents), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


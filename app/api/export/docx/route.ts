import { NextRequest } from 'next/server';
import { convertHtmlToDocx } from '@/lib/services/html-to-docx';

/**
 * POST /api/export/docx
 * Converts HTML to DOCX using the docx library (preserves styling)
 * Request body: { html: string, filename: string }
 * Returns: DOCX file as blob
 */
export async function POST(request: NextRequest) {
  try {
    const { html, filename } = await request.json();

    if (!html || !filename) {
      return new Response(
        JSON.stringify({ error: 'html and filename are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // DEBUG: Log the HTML being received
    console.log('[EXPORT DOCX] Received HTML length:', html.length);
    console.log('[EXPORT DOCX] Contains <ul>:', html.includes('<ul'));
    console.log('[EXPORT DOCX] Contains <li>:', html.includes('<li'));
    console.log('[EXPORT DOCX] Contains list-style-type:', html.includes('list-style-type'));
    console.log('[EXPORT DOCX] First 500 chars:', html.substring(0, 500));

    // Convert HTML to DOCX
    const docxBuffer = await convertHtmlToDocx(html);

    // Return the DOCX file
    return new Response(docxBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error in DOCX export:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}


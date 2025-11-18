import HTMLtoDOCX from 'html-to-docx';

/**
 * Convert HTML to DOCX using html-to-docx library
 * Handles all HTML patterns: tables, headings (h1-h6), text formatting, lists, etc.
 */
export async function convertHtmlToDocx(htmlContent: string): Promise<Buffer> {
  // Remove width constraints that can cause rendering issues
  const sanitizedHtml = htmlContent.replace(/width:\s*[^;]+;?/gi, '');
  
  // DEBUG: Log sanitization changes
  console.log('[HTML-TO-DOCX] Before sanitization - Contains <ul>:', htmlContent.includes('<ul'));
  console.log('[HTML-TO-DOCX] Before sanitization - Contains <li>:', htmlContent.includes('<li'));
  console.log('[HTML-TO-DOCX] After sanitization - Contains <ul>:', sanitizedHtml.includes('<ul'));
  console.log('[HTML-TO-DOCX] After sanitization - Contains <li>:', sanitizedHtml.includes('<li'));
  console.log('[HTML-TO-DOCX] HTML matches:', htmlContent === sanitizedHtml);
  
  // Convert using html-to-docx library
  const docxBuffer = await HTMLtoDOCX(sanitizedHtml);
  
  return docxBuffer;
}


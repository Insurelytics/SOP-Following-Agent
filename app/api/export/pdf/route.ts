import { NextRequest } from 'next/server';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { load } from 'cheerio';
import { execFile } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Parse CSS color to 6-digit hex format
 */
function parseColor(colorStr: string): string {
  if (!colorStr) return '000000';
  let hex = colorStr.replace('#', '').toUpperCase();
  
  // Convert 3-digit hex to 6-digit hex (e.g., #666 -> #666666)
  if (hex.length === 3) {
    hex = hex.split('').map(ch => ch + ch).join('');
  }
  
  return hex;
}

/**
 * Extract color from inline styles
 */
function getColorFromStyle(styleStr: string): string {
  if (!styleStr) return '000000';
  const match = styleStr.match(/color:\s*([^;]+)/i);
  if (match) {
    return parseColor(match[1].trim());
  }
  return '000000';
}

/**
 * Extract margin/spacing from styles
 */
function getMarginFromStyle(styleStr: string): { before: number; after: number } {
  if (!styleStr) return { before: 0, after: 0 };
  const marginMatch = styleStr.match(/margin(?:-top)?:\s*(\d+)px/i);
  const marginBottomMatch = styleStr.match(/margin(?:-bottom)?:\s*(\d+)px/i);
  
  const topMargin = marginMatch ? parseInt(marginMatch[1]) * 20 : 0; // Convert px to twips
  const bottomMargin = marginBottomMatch ? parseInt(marginBottomMatch[1]) * 20 : 0;
  
  return { before: topMargin, after: bottomMargin };
}

/**
 * Convert HTML to DOCX preserving styling
 */
async function convertHtmlToDocx(htmlContent: string): Promise<Buffer> {
  const $ = load(htmlContent);
  const children: any[] = [];

  // Process body content
  $('body').children().each((i, elem) => {
    const $elem = $(elem);
    const tagName = elem.name;
    const styleStr = $elem.attr('style') || '';

    if (tagName === 'div') {
      // Process children of div
      $elem.children().each((j, childElem) => {
        const $child = $(childElem);
        const childTag = childElem.name;
        const childStyle = $child.attr('style') || '';

        if (childTag === 'h2') {
          const color = getColorFromStyle(childStyle);
          const margin = getMarginFromStyle(childStyle);
          const text = $child.text();
          
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: text,
                  color: color,
                  bold: true,
                  size: 52, // 26pt
                  font: 'Arial',
                }),
              ],
              spacing: margin,
            })
          );
        } else if (childTag === 'p') {
          const color = getColorFromStyle(childStyle);
          const margin = getMarginFromStyle(childStyle);
          const text = $child.text();
          
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: text,
                  color: color,
                  font: 'Arial',
                }),
              ],
              spacing: margin,
            })
          );
        } else if (childTag === 'ul') {
          const ulStyle = $child.attr('style') || '';
          const ulColor = getColorFromStyle(ulStyle);
          
          $child.find('li').each((k, liElem) => {
            const $li = $(liElem);
            const liText = $li.text();
            const liStyle = $li.attr('style') || '';
            const liColor = getColorFromStyle(liStyle);
            
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: liText,
                    color: liColor || ulColor,
                    font: 'Arial',
                  }),
                ],
                bullet: {
                  level: 0,
                },
              })
            );
          });
        }
      });
    }
  });

  const doc = new Document({
    sections: [
      {
        children: children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * Convert DOCX buffer to PDF using LibreOffice
 */
async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  const tempDir = tmpdir();
  const docxFileName = `temp_${Date.now()}.docx`;
  const pdfFileName = `temp_${Date.now()}.pdf`;
  
  const docxPath = join(tempDir, docxFileName);
  const pdfPath = join(tempDir, pdfFileName);

  try {
    // Write DOCX to temp file
    await writeFile(docxPath, docxBuffer);

    // Convert DOCX to PDF using LibreOffice
    await execFileAsync('libreoffice', [
      '--headless',
      '--convert-to', 'pdf',
      '--outdir', tempDir,
      docxPath,
    ]);

    // The output file will be named with .pdf extension
    const { readFile } = await import('fs/promises');
    const pdfBuffer = await readFile(pdfPath);

    return pdfBuffer;
  } finally {
    // Clean up temp files
    try {
      await unlink(docxPath);
    } catch (e) {
      // Ignore cleanup errors
    }
    try {
      await unlink(pdfPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * POST /api/export/pdf
 * Converts HTML to DOCX, then DOCX to PDF, ensuring styling consistency
 * Request body: { html: string, filename: string }
 * Returns: PDF file as blob
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

    // Convert HTML to DOCX
    const docxBuffer = await convertHtmlToDocx(html);

    // Convert DOCX to PDF
    const pdfBuffer = await convertDocxToPdf(docxBuffer);

    // Extract filename without extension and add .pdf
    const pdfFilename = filename.replace(/\.[^/.]+$/, '.pdf');

    // Return the PDF file
    // Cast pdfBuffer to satisfy the Response body type, which does not include Node's Buffer by default
    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfFilename}"`,
      },
    });
  } catch (error) {
    console.error('Error in PDF export:', error);
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


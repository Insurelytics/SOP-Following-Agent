import { Document, Packer, Paragraph, TextRun } from 'docx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { marked } from 'marked';

/**
 * Convert markdown to HTML
 */
export function markdownToHtml(markdown: string): string {
  return marked(markdown) as string;
}

/**
 * Export markdown as PDF
 */
export async function exportMarkdownAsPDF(
  markdown: string,
  filename: string
): Promise<void> {
  const html = markdownToHtml(markdown);
  
  const element = document.createElement('div');
  element.innerHTML = html;
  element.style.padding = '20px';
  element.style.fontFamily = 'Arial, sans-serif';
  element.style.lineHeight = '1.5';
  element.style.maxWidth = '210mm'; // A4 width
  element.style.color = '#000000'; // Ensure dark text color
  element.style.backgroundColor = '#ffffff'; // Ensure white background
  
  // Ensure all text elements have good contrast
  element.querySelectorAll('*').forEach((el) => {
    const computed = window.getComputedStyle(el);
    // Only set color if not explicitly set to something dark
    if (!el.hasAttribute('style') || !el.getAttribute('style')?.includes('color')) {
      (el as HTMLElement).style.color = '#000000';
    }
  });
  
  // Temporarily add to DOM for rendering
  document.body.appendChild(element);
  
  try {
    // Convert HTML element to canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    // Create PDF from canvas
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate image dimensions to fit on page
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;
    
    let imgWidth = pdfWidth - 20; // 10mm margins on each side
    let imgHeight = imgWidth / ratio;
    
    // Handle multi-page PDFs if content is longer than one page
    let heightLeft = imgHeight;
    let position = 10; // Top margin
    
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight - 20;
    
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 20;
    }
    
    // Download the PDF
    pdf.save(filename);
  } finally {
    // Remove temporary element
    document.body.removeChild(element);
  }
}

/**
 * Parse markdown and convert to DOCX-compatible structure
 */
function parseMarkdownToDocxElements(markdown: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = markdown.split('\n');
  
  let currentParagraphText: TextRun[] = [];
  let inCodeBlock = false;
  let codeBlockContent = '';

  for (const line of lines) {
    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        paragraphs.push(
          new Paragraph({
            text: codeBlockContent.trim(),
            style: 'Code',
            spacing: { line: 240 },
          })
        );
        codeBlockContent = '';
        inCodeBlock = false;
      } else {
        // Start of code block
        inCodeBlock = true;
        codeBlockContent = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += line + '\n';
      continue;
    }

    // Handle headings
    const headingMatch = line.match(/^(#+)\s+(.+)$/);
    if (headingMatch) {
      if (currentParagraphText.length > 0) {
        paragraphs.push(new Paragraph({ children: currentParagraphText }));
        currentParagraphText = [];
      }
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      paragraphs.push(
        new Paragraph({
          text: headingText,
          style: `Heading${level}`,
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }

    // Handle horizontal rules
    if (line.match(/^-{3,}|_{3,}|\*{3,}$/)) {
      if (currentParagraphText.length > 0) {
        paragraphs.push(new Paragraph({ children: currentParagraphText }));
        currentParagraphText = [];
      }
      paragraphs.push(new Paragraph({ border: { bottom: { color: 'cccccc', space: 1, style: 'single', size: 6 } } }));
      continue;
    }

    // Handle empty lines
    if (line.trim() === '') {
      if (currentParagraphText.length > 0) {
        paragraphs.push(new Paragraph({ children: currentParagraphText }));
        currentParagraphText = [];
      }
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }

    // Handle list items
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      if (currentParagraphText.length > 0) {
        paragraphs.push(new Paragraph({ children: currentParagraphText }));
        currentParagraphText = [];
      }
      const indent = listMatch[1].length;
      const isOrdered = /\d+\./.test(listMatch[2]);
      const level = Math.floor(indent / 2);
      
      if (isOrdered) {
        // Ordered list - use numbered style
        paragraphs.push(
          new Paragraph({
            text: listMatch[3],
            numbering: {
              level: level,
              reference: 'default-numbering',
            },
          })
        );
      } else {
        // Unordered list - use bullets
        paragraphs.push(
          new Paragraph({
            text: listMatch[3],
            bullet: {
              level: level,
            },
          })
        );
      }
      continue;
    }

    // Regular paragraph text with inline formatting
    const text = parseInlineMarkdown(line);
    if (currentParagraphText.length === 0) {
      currentParagraphText = text;
    } else {
      currentParagraphText.push(...text);
    }
  }

  // Add any remaining paragraph
  if (currentParagraphText.length > 0) {
    paragraphs.push(new Paragraph({ children: currentParagraphText }));
  }

  return paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: '' })];
}

/**
 * Parse inline markdown formatting (bold, italic, code, links)
 */
function parseInlineMarkdown(text: string): TextRun[] {
  const runs: TextRun[] = [];

  // Pattern to match markdown formatting
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)|__(.+?)__|_(.+?)_/g;
  let match;
  let lastIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      runs.push(new TextRun(text.substring(lastIndex, match.index)));
    }

    if (match[1]) {
      // Bold **text**
      runs.push(new TextRun({ text: match[1], bold: true }));
    } else if (match[2]) {
      // Italic *text*
      runs.push(new TextRun({ text: match[2], italics: true }));
    } else if (match[3]) {
      // Code `text`
      runs.push(new TextRun({ text: match[3], font: 'Courier New', color: '666666' }));
    } else if (match[4] && match[5]) {
      // Link [text](url)
      runs.push(new TextRun({ text: match[4], color: '0563C1', underline: {} }));
    } else if (match[6]) {
      // Bold __text__
      runs.push(new TextRun({ text: match[6], bold: true }));
    } else if (match[7]) {
      // Italic _text_
      runs.push(new TextRun({ text: match[7], italics: true }));
    }

    lastIndex = pattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    runs.push(new TextRun(text.substring(lastIndex)));
  }

  return runs.length > 0 ? runs : [new TextRun(text)];
}

/**
 * Export markdown as Word document
 */
export async function exportMarkdownAsDocx(
  markdown: string,
  filename: string
): Promise<void> {
  const paragraphs = parseMarkdownToDocxElements(markdown);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

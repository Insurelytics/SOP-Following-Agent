/**
 * File utilities for handling file uploads and validation
 */

// Supported MIME types for images
const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

// Supported MIME types for documents
const DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain', // .txt
  'application/json', // .json
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
]);

// File size limits (in bytes)
const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DOCUMENT_MAX_SIZE = 20 * 1024 * 1024; // 20MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Check if a file is an image
 */
export function isImage(file: File): boolean {
  return IMAGE_TYPES.has(file.type);
}

/**
 * Check if a file is a document
 */
export function isDocument(file: File): boolean {
  return DOCUMENT_TYPES.has(file.type);
}

/**
 * Validate a file for upload
 */
export function validateFile(file: File): FileValidationResult {
  // Check file type
  if (!isImage(file) && !isDocument(file)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Supported types: images (PNG, JPEG, GIF, WebP) and documents (PDF, DOCX, XLSX, TXT, JSON, PPTX)`,
    };
  }

  // Check file size
  const maxSize = isImage(file) ? IMAGE_MAX_SIZE : DOCUMENT_MAX_SIZE;
  if (file.size > maxSize) {
    const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File is too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate multiple files
 */
export function validateFiles(files: File[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const file of files) {
    const result = validateFile(file);
    if (!result.valid && result.error) {
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert a file to base64 string (client-side only)
 * This function uses FileReader and can only be called from client-side code
 */
export async function fileToBase64(file: File): Promise<string> {
  if (typeof FileReader === 'undefined') {
    throw new Error('fileToBase64 can only be used in browser/client-side code');
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 part (remove data:image/jpeg;base64, prefix)
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get file MIME type from file extension
 */
export function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain',
    'json': 'application/json',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file icon based on type
 */
export function getFileIcon(file: File): string {
  if (isImage(file)) {
    return '🖼️';
  } else if (file.type === 'application/pdf') {
    return '📄';
  } else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
    return '📝';
  } else if (file.type.includes('sheet') || file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    return '📊';
  } else if (file.type.includes('presentation') || file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
    return '🎨';
  } else {
    return '📎';
  }
}

/**
 * Check if a file type requires text extraction (not natively supported by OpenAI)
 */
export function requiresTextExtraction(file: File): boolean {
  // Only PDF is natively supported by OpenAI's file API
  // Everything else needs text extraction
  return file.type !== 'application/pdf' && !isImage(file);
}

/**
 * Extract text from a file (client-side only)
 * Supports: TXT, JSON, DOCX, and other formats
 */
export async function extractTextFromFile(file: File): Promise<string> {
  if (typeof FileReader === 'undefined') {
    throw new Error('extractTextFromFile can only be used in browser/client-side code');
  }

  // For plain text files
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // For JSON files
  if (file.type === 'application/json' || file.name.endsWith('.json')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result as string);
          resolve(JSON.stringify(json, null, 2));
        } catch (e) {
          resolve(reader.result as string);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // For DOCX files, use mammoth library
  if (
    file.name.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value || '[Unable to extract text from document]';
    } catch (e) {
      console.error(`Error extracting DOCX text from ${file.name}:`, e);
      return `[Error extracting text from ${file.name}: ${e instanceof Error ? e.message : 'Unknown error'}]`;
    }
  }

  // For XLSX, PPTX, and other binary formats - return placeholder
  if (
    file.name.endsWith('.xlsx') ||
    file.name.endsWith('.pptx') ||
    file.name.endsWith('.doc') ||
    file.name.endsWith('.xls') ||
    file.name.endsWith('.ppt')
  ) {
    return `[Document: ${file.name} - Binary format not yet supported for text extraction. Please convert to PDF or TXT for full content analysis.]`;
  }

  // Fallback
  return `[File: ${file.name} - Unable to extract text from this format]`;
}


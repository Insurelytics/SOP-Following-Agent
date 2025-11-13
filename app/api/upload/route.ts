import { NextRequest } from 'next/server';
import { openai } from '@/lib/openai';
import { validateFiles, isImage, requiresTextExtraction } from '@/lib/file-utils';

interface FileUploadResponse {
  file_id?: string;
  filename: string;
  file_type: string;
  size: number;
  is_image: boolean;
  is_pdf: boolean;
  requires_text_extraction: boolean;
  base64?: string;
  error?: string;
}

/**
 * POST /api/upload - Upload files to OpenAI
 * Handles both image and document/file uploads
 * For images: Returns metadata (client will handle base64 conversion)
 * For PDFs: Uploads to OpenAI and returns file_id
 * For other documents: Returns metadata for client-side text extraction
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No files provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate files
    const validation = validateFiles(files);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ errors: validation.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results: FileUploadResponse[] = [];

    for (const file of files) {
      try {
        if (isImage(file)) {
          // For images, just return metadata - client will handle base64 conversion
          results.push({
            filename: file.name,
            file_type: file.type,
            size: file.size,
            is_image: true,
            is_pdf: false,
            requires_text_extraction: false,
          });
        } else if (file.type === 'application/pdf') {
          // For PDFs, upload to OpenAI Files API
          const uploadedFile = await openai.files.create({
            file: file,
            purpose: 'assistants',
          });

          results.push({
            file_id: uploadedFile.id,
            filename: file.name,
            file_type: file.type,
            size: file.size,
            is_image: false,
            is_pdf: true,
            requires_text_extraction: false,
          });
        } else {
          // For other text-based documents, return metadata for client-side text extraction
          results.push({
            filename: file.name,
            file_type: file.type,
            size: file.size,
            is_image: false,
            is_pdf: false,
            requires_text_extraction: true,
          });
        }
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        results.push({
          filename: file.name,
          file_type: file.type,
          size: file.size,
          is_image: isImage(file),
          is_pdf: file.type === 'application/pdf',
          requires_text_extraction: requiresTextExtraction(file),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(JSON.stringify({ files: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in upload endpoint:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


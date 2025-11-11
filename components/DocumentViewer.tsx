'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { exportMarkdownAsDocx, exportMarkdownAsPDF } from '@/lib/document-export';

interface Document {
  id: number;
  document_name: string;
  content: string;
  created_at: string;
}

interface DocumentViewerProps {
  chatId: number;
  selectedDocumentId?: number | null;
  onDocumentSelect?: (documentId: number) => void;
  onClose?: () => void;
}

export default function DocumentViewer({
  chatId,
  selectedDocumentId,
  onDocumentSelect,
  onClose,
}: DocumentViewerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  // Fetch documents for the chat
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/documents?chatId=${chatId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }

        const data = await response.json();
        setDocuments(data || []);

        // If documents were just loaded and there's a selected one, select it
        if (selectedDocumentId && data && data.length > 0) {
          const doc = data.find((d: Document) => d.id === selectedDocumentId);
          if (doc) {
            setSelectedDocument(doc);
          } else if (data.length > 0) {
            // Otherwise, select the first document
            setSelectedDocument(data[0]);
          }
        } else if (data && data.length > 0) {
          // Auto-select the most recent document if none selected
          setSelectedDocument(data[data.length - 1]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load documents');
        console.error('Error fetching documents:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [chatId, selectedDocumentId]);

  const handleSelectDocument = (doc: Document) => {
    setSelectedDocument(doc);
    onDocumentSelect?.(doc.id);
    setIsDropdownOpen(false);
  };

  // Handle clicking outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (downloadRef.current && !downloadRef.current.contains(event.target as Node)) {
        setIsDownloadOpen(false);
      }
    };

    if (isDropdownOpen || isDownloadOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isDownloadOpen]);

  // Handle document download
  const handleDownload = async (format: 'pdf' | 'docx' | 'md') => {
    if (!selectedDocument) return;

    const filename = selectedDocument.document_name;

    try {
      if (format === 'md') {
        // For markdown, download as plain text
        const blob = new Blob([selectedDocument.content], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.md`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (format === 'docx') {
        // Use docx library for proper Word export
        await exportMarkdownAsDocx(selectedDocument.content, `${filename}.docx`);
      } else if (format === 'pdf') {
        // Use html2pdf for proper PDF export
        await exportMarkdownAsPDF(selectedDocument.content, `${filename}.pdf`);
      }
      setIsDownloadOpen(false);
    } catch (error) {
      console.error(`Error exporting as ${format}:`, error);
      // Fallback error handling could be added here
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background-secondary">
        <div className="text-foreground-muted">Loading documents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-background-secondary">
        <div className="text-red-400 text-sm text-center px-4">
          {error}
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-background-secondary">
        <div className="text-center text-foreground-muted">
          <p className="text-sm mb-2">No documents yet</p>
          <p className="text-xs">Documents will appear here when generated</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background-secondary">
      {/* Unified Header with optional dropdown for multiple documents */}
      {selectedDocument && (
        <div className="border-b border-border bg-background-tertiary px-4 py-3 flex items-center justify-between gap-4">
          {/* Left side: Close button + Title with optional dropdown */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1 hover:bg-background-secondary rounded-md transition-colors text-foreground-muted hover:text-foreground flex-shrink-0"
              title="Close document viewer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Title with optional dropdown indicator */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => documents.length > 1 && setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-2 text-sm font-semibold text-foreground truncate ${
                  documents.length > 1 ? 'hover:opacity-70 transition-opacity cursor-pointer' : ''
                }`}
                title={documents.length > 1 ? 'Click to select another document' : ''}
              >
                <span className="truncate">{selectedDocument.document_name}</span>
                {documents.length > 1 && (
                  <svg
                    className={`w-4 h-4 transition-transform flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 9l6 6 6-6"
                    />
                  </svg>
                )}
              </button>

              {/* Dropdown menu */}
              {isDropdownOpen && documents.length > 1 && (
                <div className="absolute top-full left-0 mt-1 bg-background-tertiary border border-border rounded-md shadow-lg z-50 min-w-max">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleSelectDocument(doc)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        selectedDocument.id === doc.id
                          ? 'bg-action text-white'
                          : 'text-foreground hover:bg-background-secondary'
                      }`}
                    >
                      {doc.document_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right side: Download button with dropdown */}
          <div ref={downloadRef} className="relative flex-shrink-0">
            <button
              onClick={() => setIsDownloadOpen(!isDownloadOpen)}
              className="p-1 hover:bg-background-secondary rounded-md transition-colors text-foreground-muted hover:text-foreground"
              title="Download document"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>

            {/* Download dropdown menu */}
            {isDownloadOpen && (
              <div className="absolute top-full right-0 mt-1 bg-background-tertiary border border-border rounded-md shadow-lg z-50 min-w-max">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDownload('md');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-background-secondary transition-colors"
                >
                  Markdown (.md)
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDownload('docx');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-background-secondary transition-colors border-t border-border"
                >
                  Word (.docx)
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDownload('pdf');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-background-secondary transition-colors border-t border-border"
                >
                  PDF (.pdf)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {selectedDocument ? (
          <div className="prose prose-sm sm:prose-base dark:prose-invert prose-headings:my-2 prose-p:my-2 prose-li:my-0 prose-code:bg-background prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-background prose-pre:p-3 prose-pre:rounded max-w-none">
            <ReactMarkdown>{selectedDocument.content}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-foreground-muted">
            <p className="text-sm">Select a document to view</p>
          </div>
        )}
      </div>
    </div>
  );
}


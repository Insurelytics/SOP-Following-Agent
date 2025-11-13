'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Upload } from 'lucide-react';

interface FileUploadMenuProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  onFileTypeDetected?: (fileType: 'image' | 'document' | 'mixed') => void;
}

export default function FileUploadMenu({ onFilesSelected, disabled, onFileTypeDetected }: FileUploadMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
    setIsOpen(false);
  };

  const detectFileType = (files: File[]): 'image' | 'document' | 'mixed' => {
    if (files.length === 0) return 'mixed';
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const imageTypes = ['image/'];
    
    let hasImages = false;
    let hasDocuments = false;

    for (const file of files) {
      const isImage = imageTypes.some(type => file.type.startsWith(type)) ||
                      imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (isImage) {
        hasImages = true;
      } else {
        hasDocuments = true;
      }
    }

    if (hasImages && hasDocuments) return 'mixed';
    if (hasImages) return 'image';
    return 'document';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const fileType = detectFileType(files);
      onFileTypeDetected?.(fileType);
      onFilesSelected(files);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Plus Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="p-2 disabled:cursor-not-allowed text-foreground hover:opacity-70 transition-opacity duration-200 flex items-center justify-center"
        title="Add files or photos"
      >
        <Plus width="20" height="20" />
      </button>

      {/* Dropdown Menu (opens upward) */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 w-96 bg-background-secondary border border-input-border rounded-2xl shadow-lg z-50" style={{ left: '-16px' }}>
          <button
            onClick={handleUploadClick}
            className="w-full text-left px-4 py-3 hover:bg-background-tertiary transition-colors duration-200 flex items-center gap-3 text-foreground"
          >
            <Upload width="18" height="18" />
            <span>Upload Images and Files</span>
          </button>
        </div>
      )}

      {/* Hidden file input - accepts both images and documents */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.docx,.xlsx,.txt,.json,.doc,.xls,.pptx"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}


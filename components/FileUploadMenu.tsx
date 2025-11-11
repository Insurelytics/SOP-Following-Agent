'use client';

import { useState, useRef, useEffect } from 'react';

interface FileUploadMenuProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function FileUploadMenu({ onFilesSelected, disabled }: FileUploadMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoClick = () => {
    photoInputRef.current?.click();
    setIsOpen(false);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
    setIsOpen(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input
    e.target.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
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
        className="p-2 rounded-full bg-background-tertiary hover:bg-input-border disabled:bg-background-tertiary disabled:cursor-not-allowed text-foreground transition-colors duration-200 flex items-center justify-center"
        title="Add files or photos"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 3C13.866 3 17 6.13401 17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3Z" />
          <path d="M10 5C10.5523 5 11 5.44772 11 6V9H14C14.5523 9 15 9.44772 15 10C15 10.5523 14.5523 11 14 11H11V14C11 14.5523 10.5523 15 10 15C9.44772 15 9 14.5523 9 14V11H6C5.44772 11 5 10.5523 5 10C5 9.44772 5.44772 9 6 9H9V6C9 5.44772 9.44772 5 10 5Z" />
        </svg>
      </button>

      {/* Dropdown Menu (opens upward) */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-48 bg-background-secondary border border-input-border rounded-lg shadow-lg z-50">
          <button
            onClick={handlePhotoClick}
            className="w-full text-left px-4 py-3 hover:bg-background-tertiary transition-colors duration-200 flex items-center gap-3 text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>Add Photos</span>
          </button>

          <div className="border-t border-input-border" />

          <button
            onClick={handleFileClick}
            className="w-full text-left px-4 py-3 hover:bg-background-tertiary transition-colors duration-200 flex items-center gap-3 text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
            <span>Add Files</span>
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={photoInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handlePhotoChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.xlsx,.txt,.json,.doc,.xls,.pptx"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}


'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isMultiLine, setIsMultiLine] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    const newHeight = Math.min(target.scrollHeight, 200);
    target.style.height = `${newHeight}px`;
    // Check if it's more than one line (24px is single line height)
    setIsMultiLine(newHeight > 24);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center">
      <div className="w-[60%] flex flex-col">
        <div className={`flex ${isMultiLine ? 'items-end' : 'items-center'} bg-gray-800 rounded-[30px] px-4 py-3 focus-within:ring-2 focus-within:ring-green-700 transition-all duration-200`}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            className="flex-1 bg-transparent text-gray-100 resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
            style={{
              minHeight: '24px',
              maxHeight: '200px',
            }}
            onInput={handleTextareaInput}
          />
          <button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            className="ml-2 p-2 rounded-full bg-green-700 hover:bg-green-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white transition-colors duration-200 flex-shrink-0 flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="icon">
              <path d="M8.99992 16V6.41407L5.70696 9.70704C5.31643 10.0976 4.68342 10.0976 4.29289 9.70704C3.90237 9.31652 3.90237 8.6835 4.29289 8.29298L9.29289 3.29298L9.36907 3.22462C9.76184 2.90427 10.3408 2.92686 10.707 3.29298L15.707 8.29298L15.7753 8.36915C16.0957 8.76192 16.0731 9.34092 15.707 9.70704C15.3408 10.0732 14.7618 10.0958 14.3691 9.7754L14.2929 9.70704L10.9999 6.41407V16C10.9999 16.5523 10.5522 17 9.99992 17C9.44764 17 8.99992 16.5523 8.99992 16Z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}


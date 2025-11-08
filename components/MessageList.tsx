'use client';

import { Message } from '@/lib/db';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface ToolCall {
  name: string;
  id: string;
}

interface MessageListProps {
  messages: Message[];
  streamingMessage?: string;
  isStreaming?: boolean;
  currentToolCall?: ToolCall | null;
  isThinking?: boolean;
}

export default function MessageList({
  messages,
  streamingMessage,
  isStreaming,
  currentToolCall,
  isThinking,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 pb-24">
      {messages.length === 0 && !streamingMessage ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-lg mb-2">Start a conversation</p>
            <p className="text-sm">Send a message to begin chatting with AI</p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex mt-4 ${
                message.role === 'user' ? 'justify-center' : 'justify-center'
              }`}
            >
              {message.role === 'user' ? (
                <div className="w-[60%] flex justify-end">
                  <div className="max-w-[70%] rounded-[20px] px-4 py-3 bg-[#00692a] text-white">
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={`${
                    message.role === 'assistant'
                      ? 'w-[60%] text-gray-100 text-left'
                      : 'w-[60%] rounded-lg px-4 py-3 bg-gray-700 text-gray-300 text-sm'
                  }`}
                >
                  {message.role === 'tool' ? (
                    <div className="font-mono text-xs">
                      <span className="text-gray-400">Tool result: </span>
                      {message.content}
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none break-words prose-p:my-2 prose-headings:my-2 prose-code:text-amber-300 prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-800 prose-pre:p-3 prose-pre:rounded">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Thinking state */}
          {isThinking && !currentToolCall && !streamingMessage && (
            <div className="flex justify-center mt-4">
              <div className="w-[60%] text-left">
                <span className="text-sm inline-block bg-gradient-to-r from-gray-500 via-blue-200 to-gray-500 bg-[length:200%_auto] animate-shimmer-text bg-clip-text text-transparent font-semibold">
                  Thinking...
                </span>
              </div>
            </div>
          )}

          {/* Tool call placeholder */}
          {currentToolCall && !streamingMessage && (
            <div className="flex justify-center mt-4">
              <div className="w-[60%] text-left">
                <span className="text-sm inline-block bg-gradient-to-r from-gray-500 via-blue-200 to-gray-500 bg-[length:200%_auto] animate-shimmer-text bg-clip-text text-transparent font-semibold">
                  Calling {currentToolCall.name} tool
                </span>
              </div>
            </div>
          )}

          {/* Streaming message */}
          {streamingMessage && (
            <div className="flex justify-center mt-4">
              <div className="w-[60%] text-gray-100 text-left">
                <div className="prose prose-invert max-w-none break-words prose-p:my-2 prose-headings:my-2 prose-code:text-amber-300 prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-800 prose-pre:p-3 prose-pre:rounded">
                  <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                  {isStreaming && (
                    <span className="inline-block w-1 h-4 ml-1 bg-gray-400 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}


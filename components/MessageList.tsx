'use client';

import { Message } from '@/lib/db';
import { useEffect, useRef } from 'react';

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
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.length === 0 && !streamingMessage ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-lg mb-2">Start a conversation</p>
            <p className="text-sm">Send a message to begin chatting with GPT</p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.role === 'assistant'
                    ? 'bg-gray-800 text-gray-100'
                    : 'bg-gray-700 text-gray-300 text-sm'
                }`}
              >
                {message.role === 'tool' ? (
                  <div className="font-mono text-xs">
                    <span className="text-gray-400">Tool result: </span>
                    {message.content}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                )}
                <div
                  className={`text-xs mt-1 ${
                    message.role === 'user'
                      ? 'text-blue-200'
                      : 'text-gray-500'
                  }`}
                >
                  {new Date(message.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {/* Thinking state */}
          {isThinking && !currentToolCall && !streamingMessage && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-3 bg-gray-800 text-gray-100">
                <span className="text-sm inline-block bg-gradient-to-r from-gray-500 via-blue-200 to-gray-500 bg-[length:200%_auto] animate-shimmer-text bg-clip-text text-transparent font-semibold">
                  thinking
                </span>
              </div>
            </div>
          )}

          {/* Tool call placeholder */}
          {currentToolCall && !streamingMessage && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-3 bg-gray-800 text-gray-100">
                <span className="text-sm inline-block bg-gradient-to-r from-gray-500 via-blue-200 to-gray-500 bg-[length:200%_auto] animate-shimmer-text bg-clip-text text-transparent font-semibold">
                  Calling {currentToolCall.name} tool
                </span>
              </div>
            </div>
          )}

          {/* Streaming message */}
          {streamingMessage && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-3 bg-gray-800 text-gray-100">
                <div className="whitespace-pre-wrap break-words">
                  {streamingMessage}
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


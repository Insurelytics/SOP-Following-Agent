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
  chatId: number;
  onOpenDocument?: (documentId: number) => void;
}

export default function MessageList({
  messages,
  streamingMessage,
  isStreaming,
  currentToolCall,
  isThinking,
  chatId,
  onOpenDocument,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when first entering a chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatId]);

  // Determine if the last message is from the assistant
  const isLastMessageAI = 
    !!streamingMessage ||
    isThinking ||
    !!currentToolCall ||
    (messages.length > 0 && messages[messages.length - 1].role === 'assistant');

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 pb-24 bg-background">
      {messages.length === 0 && !streamingMessage ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-foreground-muted">
            <p className="text-lg mb-2">Start a conversation</p>
            <p className="text-sm">Send a message to begin chatting with AI</p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message, index) => {
            
            return (
            <div
              key={message.id}
              className={`flex mt-4 ${
                message.role === 'user' ? 'justify-center' : 'justify-center'
              }`}
            >
              {message.role === 'user' ? (
                <div className="w-[60%] flex justify-end">
                  <div className="max-w-[70%] rounded-[20px] px-4 py-3 bg-message-user-bg text-white">
                    {message.content && (
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                    )}
                    {/* Display file attachments */}
                    {message.file_attachments && (
                      <div className="mt-3 space-y-2">
                        {(() => {
                          try {
                            const attachments = JSON.parse(message.file_attachments);
                            return attachments.map((attachment: any, idx: number) => (
                              <div key={idx} className="text-sm bg-white/20 rounded px-2 py-1">
                                {attachment.is_image ? (
                                  <>
                                    <div className="text-xs opacity-75">📸 Image:</div>
                                    <div className="font-medium break-words">{attachment.filename}</div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-xs opacity-75">📄 Document:</div>
                                    <div className="font-medium break-words">{attachment.filename}</div>
                                  </>
                                )}
                              </div>
                            ));
                          } catch (e) {
                            return null;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`${
                    message.role === 'assistant'
                      ? 'w-[60%] text-foreground text-left'
                      : 'w-[60%] rounded-lg px-4 py-3 bg-background-tertiary text-foreground-muted text-sm'
                  }`}
                >
                  {message.role === 'tool' ? (
                    <div>
                      {message.tool_name === 'write_document' ? (
                        <div className="text-sm text-foreground-muted italic">
                          Document created:{' '}
                          <button
                            onClick={() => {
                              // Extract document ID from metadata
                              try {
                                const metadata = message.metadata ? JSON.parse(message.metadata) : {};
                                if (metadata.documentId && onOpenDocument) {
                                  onOpenDocument(parseInt(metadata.documentId));
                                }
                              } catch (e) {
                                console.error('Error parsing tool metadata:', e);
                              }
                            }}
                            className="text-foreground underline hover:opacity-80 transition-opacity cursor-pointer font-normal"
                          >
                            {(() => {
                              try {
                                const metadata = message.metadata ? JSON.parse(message.metadata) : {};
                                return metadata.documentName ? `${metadata.documentName}` : 'View Document';
                              } catch {
                                return 'View Document';
                              }
                            })()}
                          </button>
                        </div>
                      ) : (
                        <div className="font-mono text-xs text-foreground-muted">
                          AI Called Tool: {message.tool_name || 'Unknown'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="max-w-none break-words prose prose-sm sm:prose-base lg:prose-lg prose-headings:my-2 prose-p:my-2 prose-li:my-0 prose-code:bg-background-tertiary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-background-tertiary prose-pre:p-3 prose-pre:rounded dark:prose-invert">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })}

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
              <div className="w-[60%] text-foreground text-left">
                <div className="max-w-none break-words prose prose-sm sm:prose-base lg:prose-lg prose-headings:my-2 prose-p:my-2 prose-li:my-0 prose-code:bg-background-tertiary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-background-tertiary prose-pre:p-3 prose-pre:rounded dark:prose-invert">
                  <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                  {isStreaming && (
                    <span className="inline-block w-1 h-4 ml-1 bg-foreground-muted animate-pulse" />
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


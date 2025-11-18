'use client';

import { Message } from '@/lib/db';
import { useEffect, useRef } from 'react';
import { Image as ImageIcon, FileText } from 'lucide-react';

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
  onOpenSOP?: () => void;
}

export default function MessageList({
  messages,
  streamingMessage,
  isStreaming,
  currentToolCall,
  isThinking,
  chatId,
  onOpenDocument,
  onOpenSOP,
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
                message.role === 'user' ? 'flex-col items-center' : 'justify-center'
              }`}
            >
              {/* Display file attachments above user message */}
              {message.role === 'user' && message.file_attachments && (
                <div className="mb-2 flex flex-wrap gap-2 justify-end w-[60%]">
                  {(() => {
                    try {
                      const attachments = JSON.parse(message.file_attachments);
                      return attachments.map((attachment: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 transition-colors duration-200">
                          <div className="flex-shrink-0">
                            {attachment.is_image ? (
                              <ImageIcon width="24" height="24" className="text-white opacity-80" />
                            ) : (
                              <FileText width="24" height="24" className="text-white opacity-80" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs opacity-70 font-medium">{attachment.is_image ? 'Image' : 'Document'}</div>
                            <div className="text-sm font-medium truncate text-white">{attachment.filename}</div>
                          </div>
                        </div>
                      ));
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>
              )}
              {message.role === 'user' ? (
                <div className="w-[60%] flex justify-end">
                  <div className="max-w-[70%] rounded-[20px] px-4 py-3 bg-message-user-bg text-white">
                    {message.content && (
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
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
                      ) : ['display_sop_to_user', 'propose_sop_edits', 'overwrite_sop', 'create_sop'].includes(message.tool_name || '') ? (
                        <div className="text-sm text-foreground-muted italic">
                          {(() => {
                            const toolName = message.tool_name || '';
                            const displayMap: Record<string, string> = {
                              'display_sop_to_user': 'SOP displayed',
                              'propose_sop_edits': 'Proposed edits',
                              'overwrite_sop': 'SOP updated',
                              'create_sop': 'SOP created',
                            };
                            return displayMap[toolName] || 'SOP updated';
                          })()}
                          :{' '}
                          <button
                            onClick={() => onOpenSOP?.()}
                            className="text-foreground underline hover:opacity-80 transition-opacity cursor-pointer font-normal"
                          >
                            {(() => {
                              try {
                                const metadata = message.metadata ? JSON.parse(message.metadata) : {};
                                return metadata.displayName || 'View SOP';
                              } catch {
                                return 'View SOP';
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
                    <div className="max-w-none break-words text-foreground leading-relaxed">
                      {message.content}
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
                <div className="max-w-none break-words text-foreground leading-relaxed">
                  {streamingMessage}
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


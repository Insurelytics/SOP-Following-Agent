'use client';

import { Message } from '@/lib/db';
import { useEffect, useRef, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Image as ImageIcon, FileText, ChevronLeft, ChevronRight, Pencil, X, Check } from 'lucide-react';
import { getThread, getBranchInfo, getBranchLeafId } from '@/lib/utils/message-tree';

// Detect if content is HTML by looking for common HTML tags
function isHTMLContent(content: string): boolean {
  if (!content) return false;
  // Check if content contains HTML tags like <div>, <p>, <h1-h6>, <ol>, <ul>, <li>, <span>, etc.
  return /<(div|p|h[1-6]|ol|ul|li|span|table|tr|td|th|a|img|strong|em|br|hr|section|article|header|footer|nav)[\s>]/i.test(content);
}

interface ToolCall {
  name: string;
  id: string;
}

interface MessageListProps {
  messages: Message[];
  currentLeafId?: number;
  onBranchChange?: (leafId: number) => void;
  onEditMessage?: (parentId: number | null | undefined, content: string) => void;
  streamingMessage?: string;
  isStreaming?: boolean;
  currentToolCall?: ToolCall | null;
  isThinking?: boolean;
  chatId: number;
  onOpenDocument?: (documentId: number) => void;
  onOpenSOP?: () => void;
  liveDocumentHtml?: string | null;
  liveDocumentName?: string | null;
}

export default function MessageList({
  messages,
  currentLeafId,
  onBranchChange,
  onEditMessage,
  streamingMessage,
  isStreaming,
  currentToolCall,
  isThinking,
  chatId,
  onOpenDocument,
  onOpenSOP,
  liveDocumentHtml,
  liveDocumentName,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveDocumentRef = useRef<HTMLDivElement>(null);
  
  // State for inline editing
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  // Compute the current thread based on the leaf ID
  const thread = useMemo(() => {
    if (!currentLeafId) {
      return [];
    }
    return getThread(currentLeafId, messages);
  }, [currentLeafId, messages]);

  // Scroll to bottom when first entering a chat or when messages update
  useEffect(() => {
    if (messages.length > 0 && !isStreaming) {
        // Only scroll on load, not every render unless needed? 
        // Logic kept simple: scroll to bottom on updates roughly.
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatId, messages.length, isStreaming]);

  // Auto-scroll live document preview as new content streams in
  useEffect(() => {
    if (liveDocumentRef.current) {
      liveDocumentRef.current.scrollTop = liveDocumentRef.current.scrollHeight;
    }
  }, [liveDocumentHtml]);
  
  const handleEditStart = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content || '');
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleEditSubmit = (parentId: number | null | undefined) => {
    if (onEditMessage && editContent.trim()) {
      onEditMessage(parentId, editContent);
      setEditingMessageId(null);
      setEditContent('');
    }
  };

  const handleNavigateBranch = (targetBranchId: number) => {
    if (onBranchChange) {
      const newLeaf = getBranchLeafId(targetBranchId, messages);
      onBranchChange(newLeaf);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 pb-24 bg-background">
      {thread.length === 0 && !streamingMessage ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-foreground-muted">
            <p className="text-lg mb-2">Start a conversation</p>
            <p className="text-sm">Send a message to begin chatting with AI</p>
          </div>
        </div>
      ) : (
        <>
          {thread.map((message, index) => {
            const branchInfo = getBranchInfo(message.id, messages);
            const isEditing = editingMessageId === message.id;

            return (
            <div
              key={message.id}
              className={`flex mt-4 group ${
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
                <div className="w-[60%] flex flex-col items-end">
                  {/* Branch Navigation Controls for User */}
                  {branchInfo && (
                    <div className="flex items-center gap-1 text-xs text-foreground-muted mb-1 select-none">
                      <button 
                        onClick={() => branchInfo.prevBranchId && handleNavigateBranch(branchInfo.prevBranchId)}
                        disabled={!branchInfo.prevBranchId}
                        className={`p-0.5 rounded hover:bg-white/10 ${!branchInfo.prevBranchId ? 'opacity-30 cursor-default' : 'cursor-pointer'}`}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span>
                        {branchInfo.currentBranchIndex} / {branchInfo.totalBranches}
                      </span>
                      <button 
                        onClick={() => branchInfo.nextBranchId && handleNavigateBranch(branchInfo.nextBranchId)}
                        disabled={!branchInfo.nextBranchId}
                        className={`p-0.5 rounded hover:bg-white/10 ${!branchInfo.nextBranchId ? 'opacity-30 cursor-default' : 'cursor-pointer'}`}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}

                  <div className="max-w-[70%] rounded-[20px] px-4 py-3 bg-message-user-bg text-white relative group/message">
                    {isEditing ? (
                      <div className="min-w-[300px]">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-black/20 text-white rounded p-2 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button 
                            onClick={handleEditCancel}
                            className="p-1.5 rounded bg-black/20 hover:bg-black/30 text-white/80"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                          <button 
                            onClick={() => handleEditSubmit(message.parent_message_id)}
                            className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white"
                            title="Save & Submit"
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {message.content && (
                        <div className="whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                        )}
                        {!isStreaming && !isEditing && (
                          <button 
                            onClick={() => handleEditStart(message)}
                            className="absolute -left-8 top-2 opacity-0 group-hover/message:opacity-100 p-1.5 rounded-full hover:bg-white/10 text-foreground-muted transition-opacity"
                            title="Edit message"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-[60%] flex flex-col items-start">
                   {/* Branch Navigation Controls for Assistant */}
                   {branchInfo && (
                    <div className="flex items-center gap-1 text-xs text-foreground-muted mb-1 select-none ml-1">
                      <button 
                        onClick={() => branchInfo.prevBranchId && handleNavigateBranch(branchInfo.prevBranchId)}
                        disabled={!branchInfo.prevBranchId}
                        className={`p-0.5 rounded hover:bg-white/10 ${!branchInfo.prevBranchId ? 'opacity-30 cursor-default' : 'cursor-pointer'}`}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span>
                        {branchInfo.currentBranchIndex} / {branchInfo.totalBranches}
                      </span>
                      <button 
                        onClick={() => branchInfo.nextBranchId && handleNavigateBranch(branchInfo.nextBranchId)}
                        disabled={!branchInfo.nextBranchId}
                        className={`p-0.5 rounded hover:bg-white/10 ${!branchInfo.nextBranchId ? 'opacity-30 cursor-default' : 'cursor-pointer'}`}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}

                  <div
                    className={`${
                      message.role === 'assistant'
                        ? 'text-foreground text-left w-full'
                        : 'w-full rounded-lg px-4 py-3 bg-background-tertiary text-foreground-muted text-sm'
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
                        ) : ['display_sop_to_user', 'overwrite_sop', 'create_sop'].includes(message.tool_name || '') ? (
                          <div className="text-sm text-foreground-muted italic">
                            {(() => {
                              const toolName = message.tool_name || '';
                              const displayMap: Record<string, string> = {
                                'display_sop_to_user': 'SOP displayed',
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
                      <div className="max-w-none break-words prose prose-sm sm:prose-base lg:prose-lg prose-headings:my-2 prose-p:my-2 prose-li:my-0 prose-code:bg-background-tertiary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-background-tertiary prose-pre:p-3 prose-pre:rounded dark:prose-invert">
                        {isHTMLContent(message.content || '') ? (
                          <div className="html-content-dark" dangerouslySetInnerHTML={{ __html: message.content || '' }} />
                        ) : (
                          <ReactMarkdown>{message.content || ''}</ReactMarkdown>
                        )}
                      </div>
                    )}
                  </div>
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

          {/* Live document HTML preview while write_document is streaming */}
          {currentToolCall?.name === 'write_document' && liveDocumentHtml && (
            <div className="flex justify-center mt-2">
              <div className="w-[60%] text-left">
                <div className="text-xs mb-1 text-foreground-muted">
                  Live document preview{liveDocumentName ? `: ${liveDocumentName}` : ''}
                </div>
                <div
                  ref={liveDocumentRef}
                  className="max-h-96 overflow-auto text-xs text-foreground opacity-80"
                >
                  <div
                    className="max-w-none break-words prose prose-xs sm:prose-sm prose-headings:my-2 prose-p:my-2 prose-li:my-0 prose-pre:p-3 prose-pre:rounded dark:prose-invert shimmer-document-text"
                    dangerouslySetInnerHTML={{ __html: liveDocumentHtml }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Streaming message */}
          {streamingMessage && (
            <div className="flex justify-center mt-4">
              <div className="w-[60%] text-foreground text-left">
                <div className="max-w-none break-words prose prose-sm sm:prose-base lg:prose-lg prose-headings:my-2 prose-p:my-2 prose-li:my-0 prose-code:bg-background-tertiary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-background-tertiary prose-pre:p-3 prose-pre:rounded dark:prose-invert">
                  {isHTMLContent(streamingMessage) ? (
                    <div className="html-content-dark" dangerouslySetInnerHTML={{ __html: streamingMessage }} />
                  ) : (
                    <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                  )}
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

'use client';

import { useState, useEffect, useRef } from 'react';
import { Message, Chat } from '@/lib/db';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { fileToBase64, extractTextFromFile } from '@/lib/file-utils';
import { getLatestLeafId, getThread } from '@/lib/utils/message-tree';

interface ChatInterfaceProps {
  chatId: number;
  currentChat?: Chat | null;
  onOpenDocument?: (documentId: number) => void;
  onOpenSOP?: () => void;
  onRefreshSOPDrafts?: () => void;
  onSOPRefresh?: () => void;
  onChatUpdated?: () => void;
}

interface ToolCall {
  name: string;
  id: string;
}

export default function ChatInterface({
  chatId,
  currentChat,
  onOpenDocument,
  onOpenSOP,
  onRefreshSOPDrafts,
  onSOPRefresh,
  onChatUpdated,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentLeafId, setCurrentLeafId] = useState<number | null>(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentToolCall, setCurrentToolCall] = useState<ToolCall | null>(null);
  const [hasContentStarted, setHasContentStarted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [liveDocumentHtml, setLiveDocumentHtml] = useState<string | null>(null);
  const [liveDocumentName, setLiveDocumentName] = useState<string | null>(null);
  const lastSOPChatIdRef = useRef<number | null>(null);
  const lastProcessedMessageIdRef = useRef<number | null>(null);
  const lastProcessedSOPDraftIdRef = useRef<number | null>(null);
  const initialMessagesCountRef = useRef<number>(0);
  const messagesFetchControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetches messages for the current chat, cancelling any in-flight request.
   * Returns the fetched messages or null if the request was aborted.
   */
  const fetchMessages = async (targetChatId: number): Promise<Message[] | null> => {
    // Cancel any in-flight request
    if (messagesFetchControllerRef.current) {
      messagesFetchControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    messagesFetchControllerRef.current = controller;
    
    try {
      const response = await fetch(`/api/messages?chatId=${targetChatId}`, {
        signal: controller.signal,
      });
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return null;
      }
      throw error;
    }
  };

  // Load messages when chat changes
  // Note: handleSendMessage and currentChat?.sop are excluded from deps as they would cause infinite loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    // Reset tracking refs for new chat
    lastProcessedMessageIdRef.current = null;
    
    fetchMessages(chatId)
      .then((data) => {
        if (data === null) return; // Request was aborted
        
        setMessages(data);
        // Initialize current leaf to the latest one if not set
        const latestLeaf = getLatestLeafId(data);
        setCurrentLeafId(latestLeaf || null);
        
        setIsLoading(false);
        
        // Track the number of messages we started with for this chat
        // Documents created after this point will be auto-opened
        initialMessagesCountRef.current = data.length;
        
        // If chat has an active SOP and no messages, auto-send greeting (but only once per chat)
        if (currentChat?.sop && data.length === 0 && lastSOPChatIdRef.current !== chatId) {
          lastSOPChatIdRef.current = chatId;
          handleSendMessage('[SOP_START]');
        }
      })
      .catch((err) => {
        console.error('Error loading messages:', err);
        setIsLoading(false);
      });
  }, [chatId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open documents when they are created (but not when loading existing chats)
  useEffect(() => {
    // Only auto-open if this is a NEW document created after we loaded this chat
    // (not an existing document from a previous session)
    if (messages.length > initialMessagesCountRef.current) {
      // Find the latest write_document tool message that we haven't processed yet
      const toolMessages = messages.filter((msg) => msg.role === 'tool' && msg.tool_name === 'write_document');
      
      if (toolMessages.length > 0) {
        const latestToolMessage = toolMessages[toolMessages.length - 1];
        
        // Only process if it's a new message (we haven't seen this one before)
        if (lastProcessedMessageIdRef.current !== latestToolMessage.id) {
          lastProcessedMessageIdRef.current = latestToolMessage.id;
          
          try {
            const metadata = latestToolMessage.metadata ? JSON.parse(latestToolMessage.metadata) : {};
            if (metadata.documentId && onOpenDocument) {
              onOpenDocument(parseInt(metadata.documentId));
            }
          } catch (e) {
            console.error('Error parsing tool metadata:', e);
          }
        }
      }
    }
  }, [messages, onOpenDocument]);

  // Auto-open SOP drafts when they are created (from display_sop_to_user, overwrite_sop, create_sop)
  useEffect(() => {
    if (messages.length > initialMessagesCountRef.current) {
      // Look for SOP-related tool calls
      const sopToolNames = ['display_sop_to_user', 'overwrite_sop', 'create_sop'];
      const toolMessages = messages.filter((msg) => msg.role === 'tool' && msg.tool_name && sopToolNames.includes(msg.tool_name));
      
      if (toolMessages.length > 0) {
        const latestToolMessage = toolMessages[toolMessages.length - 1];
        
        // Only process if it's a new message (we haven't seen this one before)
        if (lastProcessedSOPDraftIdRef.current !== latestToolMessage.id) {
          lastProcessedSOPDraftIdRef.current = latestToolMessage.id;
          
          try {
            const metadata = latestToolMessage.metadata ? JSON.parse(latestToolMessage.metadata) : {};
            if (metadata.draftId) {
              // Refresh drafts so SOPViewer picks up the new one
              onRefreshSOPDrafts?.();
              // Open the SOP viewer
              onOpenSOP?.();
            }
          } catch (e) {
            console.error('Error parsing SOP tool metadata:', e);
          }
        }
      }
    }
  }, [messages, onOpenSOP, onRefreshSOPDrafts]);

  const handleSendMessage = async (message: string, files?: File[], parentMessageId?: number | null) => {
    if (!chatId || isStreaming) return;

    let uploadedFiles: Array<{ file_id?: string; filename: string; file_type: string; size: number; is_image: boolean; is_pdf?: boolean; requires_text_extraction?: boolean; base64?: string; extracted_text?: string; error?: string }> = [];

    // Upload files if provided
    if (files && files.length > 0) {
      try {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('files', file);
        });

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload files');
        }

        const uploadResult = await uploadResponse.json();
        uploadedFiles = uploadResult.files;

        // Check for any upload errors
        const uploadErrors = uploadedFiles.filter((f) => f.error);
        if (uploadErrors.length > 0) {
          console.error('Some files failed to upload:', uploadErrors);
          // Continue with successfully uploaded files
          uploadedFiles = uploadedFiles.filter((f) => !f.error);
        }

        // For images, convert to base64 on the client side
        // For text-based documents, extract text and store in attachment metadata
        for (let i = 0; i < uploadedFiles.length; i++) {
          if (uploadedFiles[i].is_image) {
            const originalFile = files.find((f) => f.name === uploadedFiles[i].filename);
            if (originalFile) {
              try {
                uploadedFiles[i].base64 = await fileToBase64(originalFile);
              } catch (e) {
                console.error(`Error converting image to base64: ${originalFile.name}`, e);
              }
            }
          } else if (uploadedFiles[i].requires_text_extraction) {
            const originalFile = files.find((f) => f.name === uploadedFiles[i].filename);
            if (originalFile) {
              try {
                const extractedText = await extractTextFromFile(originalFile);
                // Store extracted text in the file attachment metadata
                (uploadedFiles[i] as any).extracted_text = extractedText;
              } catch (e) {
                console.error(`Error extracting text from file: ${originalFile.name}`, e);
                (uploadedFiles[i] as any).extracted_text = `Error extracting text: ${e instanceof Error ? e.message : 'Unknown error'}`;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error uploading files:', error);
        alert('Failed to upload some files. Please try again.');
        return;
      }
    }

    // Only add user message to display if it's not a system command
    if (message !== '[SOP_START]') {
      const effectiveParentId = parentMessageId !== undefined ? parentMessageId : currentLeafId;
      const userMessage: Message = {
        id: Date.now(), // Temporary ID
        chat_id: chatId,
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
        file_attachments: uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles) : undefined,
        parent_message_id: effectiveParentId
      };
      
      setMessages((prev) => {
          const newMessages = [...prev, userMessage];
          return newMessages;
      });
      
      // Optimistically update the current leaf to this new message
      // This ensures the view switches to the new branch immediately
      setCurrentLeafId(userMessage.id);
    }

    setIsStreaming(true);
    setStreamingMessage('');
    setCurrentToolCall(null);
    setHasContentStarted(false);
    setIsThinking(true);
    setLiveDocumentHtml(null);
    setLiveDocumentName(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chatId, 
          message, 
          files: uploadedFiles,
          parentMessageId: parentMessageId !== undefined ? parentMessageId : currentLeafId 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content') {
                // When content starts streaming, clear thinking state
                // but keep any active tool call placeholder until the tool
                // has fully completed and its messages are in history.
                if (!hasContentStarted) {
                  setHasContentStarted(true);
                  setIsThinking(false);
                }
                setStreamingMessage((prev) => prev + data.content);
              } else if (data.type === 'tool') {
                // Distinguish between tool selection/start (no result/messagesToSave)
                // and tool completion (includes result/messagesToSave which have
                // already been persisted by the server).
                const isToolCompletion = !!data.result || !!data.messagesToSave;

                if (!isToolCompletion) {
                  // Tool has been selected but not yet finished executing.
                  // Show tool execution as a placeholder, hide thinking.
                  setIsThinking(false);
                  setCurrentToolCall({
                    name: data.name,
                    id: data.name,
                  });
                } else {
                  // Tool has finished executing. Transition from the placeholder
                  // to the permanent tool messages by refreshing the message list.
                  setIsThinking(false);
                  setCurrentToolCall(null);

                  // Reload messages so the newly-saved tool messages appear
                  // immediately in the history while the assistant response
                  // continues streaming.
                  fetchMessages(chatId)
                    .then((updatedMessages) => {
                      if (updatedMessages === null) return; // Request was aborted
                      
                      setMessages(updatedMessages);

                      // Ensure currentLeafId always points to a real message after we
                      // refresh history for tool calls. If the current leaf is a
                      // temporary client ID (e.g. Date.now()) that doesn't exist in
                      // the reloaded list, fall back to the latest leaf in the tree.
                      const latestLeaf = getLatestLeafId(updatedMessages);
                      setCurrentLeafId((prev) => {
                        if (!prev) return latestLeaf || null;
                        const exists = updatedMessages.some((m: Message) => m.id === prev);
                        return exists ? prev : (latestLeaf || prev || null);
                      });
                    })
                    .catch((err) => {
                      console.error('Error reloading messages after tool completion:', err);
                    });
                }
              } else if (data.type === 'document_stream') {
                // Live document HTML preview while write_document tool is being constructed
                if (typeof data.html === 'string' && data.html.length > 0) {
                  setLiveDocumentHtml(data.html);
                }
                if (typeof data.documentName === 'string' && data.documentName.length > 0) {
                  setLiveDocumentName(data.documentName);
                }
              } else if (data.type === 'done') {
                // Stream complete - trigger SOP header refresh to show step updates
                onSOPRefresh?.();
                // Chat metadata (including title) may have been updated; refresh chats
                onChatUpdated?.();
                break;
              } else if (data.type === 'error') {
                console.error('Stream error:', data.message);
                setStreamingMessage((prev) => prev + `\n[Error: ${data.message}]`);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      // Reload messages to get the saved version (this will cancel any in-flight tool completion fetches)
      const updatedMessages = await fetchMessages(chatId);
      if (updatedMessages !== null) {
        setMessages(updatedMessages);
        
        // Update current leaf to the latest message in the updated list
        // This ensures we are looking at the tip of the newly created branch
        const newLeaf = getLatestLeafId(updatedMessages);
        if (newLeaf) setCurrentLeafId(newLeaf);
      }

      setStreamingMessage('');
      setCurrentToolCall(null);
      setHasContentStarted(false);
      setIsThinking(false);
      setLiveDocumentHtml(null);
      setLiveDocumentName(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setStreamingMessage('Error: Failed to send message');
    } finally {
      setIsStreaming(false);
    }
  };

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground-muted bg-background">
        <div className="text-center">
          <p className="text-lg mb-2">No chat selected</p>
          <p className="text-sm">Create a new chat or select an existing one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Messages and Input */}
      {isLoading || (currentChat?.sop && messages.length === 0 && !streamingMessage) ? (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-foreground-muted">Loading messages...</div>
        </div>
      ) : (
        <>
          <MessageList
            messages={messages} // Pass all messages so MessageList can compute siblings
            currentLeafId={currentLeafId || undefined}
            onBranchChange={setCurrentLeafId}
            onEditMessage={(parentId, content) => handleSendMessage(content, undefined, parentId)}
            streamingMessage={streamingMessage}
            isStreaming={isStreaming}
            currentToolCall={currentToolCall}
            isThinking={isThinking}
            chatId={chatId}
            onOpenDocument={onOpenDocument}
            onOpenSOP={onOpenSOP}
            liveDocumentHtml={liveDocumentHtml}
            liveDocumentName={liveDocumentName}
          />
          <ChatInput onSendMessage={(msg, files) => handleSendMessage(msg, files)} disabled={isStreaming} />
        </>
      )}
    </div>
  );
}


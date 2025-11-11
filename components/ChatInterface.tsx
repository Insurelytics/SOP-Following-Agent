'use client';

import { useState, useEffect, useRef } from 'react';
import { Message, Chat } from '@/lib/db';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

interface ChatInterfaceProps {
  chatId: number;
  currentChat?: Chat | null;
  onOpenDocument?: (documentId: number) => void;
  onSOPRefresh?: () => void;
}

interface ToolCall {
  name: string;
  id: string;
}

export default function ChatInterface({
  chatId,
  currentChat,
  onOpenDocument,
  onSOPRefresh,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentToolCall, setCurrentToolCall] = useState<ToolCall | null>(null);
  const [hasContentStarted, setHasContentStarted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const lastSOPChatIdRef = useRef<number | null>(null);
  const lastProcessedMessageIdRef = useRef<number | null>(null);
  const initialMessagesCountRef = useRef<number>(0);

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
    
    fetch(`/api/messages?chatId=${chatId}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data);
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

  const handleSendMessage = async (message: string) => {
    if (!chatId || isStreaming) return;

    // Only add user message to display if it's not a system command
    if (message !== '[SOP_START]') {
      const userMessage: Message = {
        id: Date.now(),
        chat_id: chatId,
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
    }

    setIsStreaming(true);
    setStreamingMessage('');
    setCurrentToolCall(null);
    setHasContentStarted(false);
    setIsThinking(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message }),
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
                // When content starts streaming, clear any tool call placeholder and thinking state
                if (!hasContentStarted) {
                  setHasContentStarted(true);
                  setCurrentToolCall(null);
                  setIsThinking(false);
                }
                setStreamingMessage((prev) => prev + data.content);
              } else if (data.type === 'tool') {
                // Show tool execution as a placeholder, hide thinking
                setIsThinking(false);
                setCurrentToolCall({
                  name: data.name,
                  id: data.name,
                });
              } else if (data.type === 'done') {
                // Stream complete - trigger SOP header refresh to show step updates
                onSOPRefresh?.();
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

      // Reload messages to get the saved version
      const messagesResponse = await fetch(`/api/messages?chatId=${chatId}`);
      const updatedMessages = await messagesResponse.json();
      setMessages(updatedMessages);
      setStreamingMessage('');
      setCurrentToolCall(null);
      setHasContentStarted(false);
      setIsThinking(false);
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
            messages={messages}
            streamingMessage={streamingMessage}
            isStreaming={isStreaming}
            currentToolCall={currentToolCall}
            isThinking={isThinking}
            chatId={chatId}
            onOpenDocument={onOpenDocument}
          />
          <ChatInput onSendMessage={handleSendMessage} disabled={isStreaming} />
        </>
      )}
    </div>
  );
}


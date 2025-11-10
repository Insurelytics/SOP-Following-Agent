'use client';

import { useState, useEffect } from 'react';
import { Message } from '@/lib/db';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import SOPHeader from './SOPHeader';

interface ChatInterfaceProps {
  chatId: number;
}

interface ToolCall {
  name: string;
  id: string;
}

export default function ChatInterface({
  chatId,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentToolCall, setCurrentToolCall] = useState<ToolCall | null>(null);
  const [hasContentStarted, setHasContentStarted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [sopRefreshTrigger, setSOPRefreshTrigger] = useState(0);

  // Load messages when chat changes
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch(`/api/messages?chatId=${chatId}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error loading messages:', err);
        setIsLoading(false);
      });
  }, [chatId]);

  const handleSendMessage = async (message: string) => {
    if (!chatId || isStreaming) return;

    // Optimistically add user message
    const userMessage: Message = {
      id: Date.now(),
      chat_id: chatId,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

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
                setSOPRefreshTrigger(prev => prev + 1);
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
      {/* SOP Header (if chat has an active SOP run) */}
      <SOPHeader chatId={chatId} refreshTrigger={sopRefreshTrigger} />

      {/* Messages */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-foreground-muted">Loading messages...</div>
        </div>
      ) : (
        <MessageList
            messages={messages}
            streamingMessage={streamingMessage}
            isStreaming={isStreaming}
            currentToolCall={currentToolCall}
            isThinking={isThinking} chatId={0}        />
      )}

      {/* Input */}
      <ChatInput onSendMessage={handleSendMessage} disabled={isStreaming} />
    </div>
  );
}


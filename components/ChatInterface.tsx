'use client';

import { useState, useEffect } from 'react';
import { Message } from '@/lib/db';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { fileToBase64, extractTextFromFile } from '@/lib/file-utils';

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

  const handleSendMessage = async (message: string, files?: File[]) => {
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

    // Add user message to display
    const userMessage: Message = {
      id: Date.now(),
      chat_id: chatId,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
      file_attachments: uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles) : undefined,
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
        body: JSON.stringify({ chatId, message, files: uploadedFiles }),
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
      {isLoading ? (
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
          />
          <ChatInput onSendMessage={handleSendMessage} disabled={isStreaming} />
        </>
      )}
    </div>
  );
}


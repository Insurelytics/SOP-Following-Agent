'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import { Chat } from '@/lib/db';

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load chats on mount
  useEffect(() => {
    loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChats = async () => {
    try {
      const response = await fetch('/api/chats');
      const data = await response.json();
      setChats(data);
      
      // Auto-select the most recent chat
      if (data.length > 0 && !currentChatId) {
        setCurrentChatId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create chat');
      }

      const newChat = await response.json();
      setChats((prev) => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const handleSelectChat = (chatId: number) => {
    setCurrentChatId(chatId);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-foreground-muted">Loading...</div>
      </div>
    );
  }

  return (
    <main className="h-screen flex bg-background text-foreground overflow-hidden">
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />
      {currentChatId ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatInterface
            chatId={currentChatId}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-foreground-muted">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4 text-foreground">AI Chat</h1>
            <p className="text-lg mb-6">Create a new chat to get started</p>
          </div>
        </div>
      )}
    </main>
  );
}


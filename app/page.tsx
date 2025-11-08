'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import { Chat } from '@/lib/db';

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [currentModel, setCurrentModel] = useState('gpt-5-nano');
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
        setCurrentModel(data[0].model);
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
        body: JSON.stringify({ model: currentModel }),
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
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setCurrentModel(chat.model);
    }
  };

  const handleModelChange = (model: string) => {
    setCurrentModel(model);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0f0f0f]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <main className="h-screen flex bg-[#0f0f0f] text-white overflow-hidden">
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />
      {currentChatId ? (
        <ChatInterface
          chatId={currentChatId}
          model={currentModel}
          onModelChange={handleModelChange}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">GPT-5 Chat Interface</h1>
            <p className="text-lg mb-6">Create a new chat to get started</p>
            <button
              onClick={handleNewChat}
              className="px-6 py-3 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors duration-200 font-medium"
            >
              Create New Chat
            </button>
          </div>
        </div>
      )}
    </main>
  );
}


'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import DocumentViewer from '@/components/DocumentViewer';
import SOPHeader from '@/components/SOPHeader';
import { Chat } from '@/lib/db';
import type { SOP } from '@/lib/types/sop';

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sopRefreshTrigger, setSOPRefreshTrigger] = useState(0);

  // Load chats and SOPs on mount
  useEffect(() => {
    loadChats();
    loadSOPs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close document viewer when switching chats
  useEffect(() => {
    setIsDocumentViewerOpen(false);
  }, [currentChatId]);

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

  const loadSOPs = async () => {
    try {
      const response = await fetch('/api/sops');
      const data = await response.json();
      setSOPs(data);
    } catch (error) {
      console.error('Error loading SOPs:', error);
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

  const handleSelectSOPTemplate = async (sopId: string) => {
    try {
      // Create a new chat
      const chatResponse = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!chatResponse.ok) {
        throw new Error('Failed to create chat');
      }

      const newChat = await chatResponse.json();
      
      // Create a new SOP run for this chat
      const runResponse = await fetch(`/api/sops/${sopId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: newChat.id }),
      });

      if (!runResponse.ok) {
        throw new Error('Failed to create SOP run');
      }

      // Fetch the SOP data to attach to the chat
      const sopResponse = await fetch(`/api/sops/${sopId}`);
      if (sopResponse.ok) {
        const sopData = await sopResponse.json();
        newChat.sop = sopData;
      }

      setChats((prev) => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
    } catch (error) {
      console.error('Error creating chat with SOP:', error);
    }
  };

  const handleSelectChat = (chatId: number) => {
    setCurrentChatId(chatId);
  };

  // Handle divider drag
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      // Find the flex container that holds chat and document viewer
      const flexContainer = document.querySelector('main > div:last-child');
      if (!flexContainer) return;

      const containerRect = flexContainer.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Constrain width between 30% and 70%
      if (newWidth >= 30 && newWidth <= 70) {
        setLeftPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

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
        sops={sops}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onSelectSOP={handleSelectSOPTemplate}
      />
      {currentChatId ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* SOP Header - Fixed at top */}
          {chats.find(c => c.id === currentChatId)?.sop && (
            <SOPHeader 
              chatId={currentChatId} 
              refreshTrigger={sopRefreshTrigger}
              sop={chats.find(c => c.id === currentChatId)?.sop!} 
            />
          )}
          
          {/* Chat and Document Viewer Container */}
          <div className="flex-1 flex overflow-hidden">
            {/* Chat Interface */}
            <div
              className="flex flex-col"
              style={{ width: `${isDocumentViewerOpen ? leftPanelWidth : 100}%` }}
            >
              <ChatInterface
                chatId={currentChatId}
                currentChat={chats.find(c => c.id === currentChatId) || null}
                onOpenDocument={(docId) => {
                  setSelectedDocumentId(docId);
                  setIsDocumentViewerOpen(true);
                }}
                onSOPRefresh={() => setSOPRefreshTrigger(prev => prev + 1)}
              />
            </div>

            {/* Resizable Divider */}
            {isDocumentViewerOpen && (
              <div
                onMouseDown={handleMouseDown}
                className={`w-1 bg-border hover:bg-primary cursor-col-resize transition-colors user-select-none ${
                  isDragging ? 'bg-primary' : ''
                }`}
              />
            )}

            {/* Document Viewer */}
            {isDocumentViewerOpen && (
              <div
                className="flex flex-col overflow-hidden"
                style={{ width: `${100 - leftPanelWidth}%` }}
              >
                <DocumentViewer
                  chatId={currentChatId}
                  selectedDocumentId={selectedDocumentId}
                  onDocumentSelect={(docId) => setSelectedDocumentId(docId)}
                  onClose={() => setIsDocumentViewerOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-foreground-muted">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4 text-foreground">SOP Following Agent</h1>
            <p className="text-lg mb-6">Create a new chat to get started</p>
          </div>
        </div>
      )}
    </main>
  );
}


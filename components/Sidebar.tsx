'use client';

import { useState, useEffect, useMemo } from 'react';
import { Chat } from '@/lib/db';
import type { SOP } from '@/lib/types/sop';
import ThemePicker from './ThemePicker';

interface SidebarProps {
  chats: Chat[];
  sops: SOP[];
  currentChatId: number | null;
  onSelectChat: (chatId: number) => void;
  onNewChat: () => void;
  onSelectSOP: (sopId: string) => void;
}

export default function Sidebar({
  chats,
  sops,
  currentChatId,
  onSelectChat,
  onNewChat,
  onSelectSOP,
}: SidebarProps) {
  const [chatSOPs, setChatSOPs] = useState<Record<number, SOP | null>>({});
  const [loading, setLoading] = useState<Set<number>>(new Set());

  // Fetch SOPs for each chat
  useEffect(() => {
    const fetchChatSOPs = async () => {
      for (const chat of chats) {
        // Skip if already loaded
        if (chatSOPs[chat.id] !== undefined) {
          continue;
        }

        setLoading((prev) => new Set(prev).add(chat.id));
        try {
          const response = await fetch(`/api/chats/${chat.id}/sop`);
          const data = await response.json();
          setChatSOPs((prev) => ({
            ...prev,
            [chat.id]: data?.sop || null,
          }));
        } catch (error) {
          console.error(`Error fetching SOP for chat ${chat.id}:`, error);
          setChatSOPs((prev) => ({
            ...prev,
            [chat.id]: null,
          }));
        } finally {
          setLoading((prev) => {
            const next = new Set(prev);
            next.delete(chat.id);
            return next;
          });
        }
      }
    };

    if (chats.length > 0) {
      fetchChatSOPs();
    }
  }, [chats, chatSOPs]);

  return (
    <div className="w-64 bg-sidebar-bg h-full flex flex-col border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <button
          onClick={() => onNewChat()}
          className="w-full px-4 py-2 bg-action hover:bg-primary-hover text-white rounded-lg transition-colors duration-200 font-medium"
        >
          + New Chat
        </button>
      </div>

      {/* SOP Templates & Chat List */}
      <div className="flex-1 overflow-y-auto">
        {/* SOP Templates Section */}
        {sops.length > 0 && (
          <div className="p-4">
            <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-3">
              SOP Templates
            </h3>
            <div className="space-y-2">
              {sops.map((sop) => (
                <button
                  key={sop.id}
                  onClick={() => onSelectSOP(sop.id)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-background-secondary/50 hover:bg-background-secondary transition-colors duration-150 group"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground group-hover:text-action truncate">
                      {sop.displayName}
                    </span>
                    <span className="text-xs text-foreground-muted mt-1 line-clamp-2">
                      {sop.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {chats.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50" />
            )}
          </div>
        )}

        {/* Chats Section */}
        {chats.length === 0 && sops.length === 0 ? (
          <div className="p-4 text-foreground-muted text-sm text-center">
            No chats yet. Create one to get started!
          </div>
        ) : chats.length > 0 ? (
          <div className="px-4 pb-4">
            <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-3">
              Chats
            </h3>
            <div className="space-y-1">
              {chats.map((chat) => {
                const chatSOP = chatSOPs[chat.id];
                const isLoadingSOP = loading.has(chat.id);
                return (
                  <button
                    key={chat.id}
                    onClick={() => onSelectChat(chat.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-150 ${
                      currentChatId === chat.id
                        ? 'bg-background-tertiary text-foreground'
                        : 'text-foreground-muted hover:bg-background-secondary/50'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium truncate">
                        {chat.title || `Chat ${chat.id}`}
                      </span>
                      {isLoadingSOP ? (
                        <span className="text-xs text-foreground-muted/60 mt-1">
                          Loading SOP...
                        </span>
                      ) : (
                        chatSOP && (
                          <span className="text-xs text-action mt-1 font-medium">
                            {chatSOP.displayName}
                          </span>
                        )
                      )}
                      <span className="text-xs text-foreground-muted mt-1">
                        {new Date(chat.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <ThemePicker />
      </div>
    </div>
  );
}


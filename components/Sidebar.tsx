'use client';

import { Chat } from '@/lib/db';
import ThemePicker from './ThemePicker';

interface SidebarProps {
  chats: Chat[];
  currentChatId: number | null;
  onSelectChat: (chatId: number) => void;
  onNewChat: () => void;
}

export default function Sidebar({
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
}: SidebarProps) {

  return (
    <div className="w-64 bg-sidebar-bg h-full flex flex-col border-r border-border">
      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {/* New Chat Section */}
        <div className="p-4">
          <button
            onClick={() => onNewChat()}
            className="w-full text-left px-3 py-2 rounded-lg bg-background-secondary/50 hover:bg-background-secondary transition-colors duration-150 group mb-3"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground group-hover:text-action truncate">
                + New Chat
              </span>
              <span className="text-xs text-foreground-muted mt-1">
                Start a new chat
              </span>
            </div>
          </button>
        </div>

        {/* Chats Section */}
        {chats.length === 0 ? (
          <div className="p-4 text-foreground-muted text-sm text-center">
            No chats yet. Create one to get started!
          </div>
        ) : (
          <div className="px-4 pb-4">
            <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-3">
              Chats
            </h3>
            <div className="space-y-1">
              {chats.map((chat) => (
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
                    <span className="text-xs text-foreground-muted mt-1">
                      {new Date(chat.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <ThemePicker />
      </div>
    </div>
  );
}


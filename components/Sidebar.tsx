'use client';

import { Chat } from '@/lib/db';

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
    <div className="w-64 bg-[#1a1a1a] h-full flex flex-col border-r border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <button
          onClick={onNewChat}
          className="w-full px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors duration-200 font-medium"
        >
          + New Chat
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-4 text-gray-500 text-sm text-center">
            No chats yet. Create one to get started!
          </div>
        ) : (
          <div className="p-2">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`w-full text-left px-3 py-2 mb-1 rounded-lg transition-colors duration-150 ${
                  currentChatId === chat.id
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium truncate">
                    {chat.title || `Chat ${chat.id}`}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-400">
                      {chat.model}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(chat.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">
          Signed in as <span className="text-gray-400 font-medium">dev-test</span>
        </div>
      </div>
    </div>
  );
}


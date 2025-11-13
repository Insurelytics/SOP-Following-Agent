import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'chat.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create chats table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      model TEXT NOT NULL,
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT,
      tool_calls TEXT,
      tool_call_id TEXT,
      metadata TEXT,
      file_attachments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    )
  `);

  console.log('Database initialized successfully');
}

// Types
export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Chat {
  id: number;
  user_id: number;
  model: string;
  title: string | null;
  created_at: string;
}

export interface Message {
  id: number;
  chat_id: number;
  role: 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: string | null; // JSON string of tool calls array
  tool_call_id?: string | null;
  metadata?: string | null; // JSON string for tool metadata (includes tool_name, etc.)
  file_attachments?: string | null; // JSON string of file attachment metadata array
  created_at: string;
}


// User operations
export function getOrCreateUser(username: string): User {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  let user = stmt.get(username) as User | undefined;

  if (!user) {
    const insert = db.prepare('INSERT INTO users (username) VALUES (?)');
    const result = insert.run(username);
    const selectStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    user = selectStmt.get(result.lastInsertRowid) as User;
  }

  return user;
}

// Chat operations
export function createChat(userId: number, model: string): Chat {
  const stmt = db.prepare(
    'INSERT INTO chats (user_id, model, title) VALUES (?, ?, ?)'
  );
  const result = stmt.run(userId, model, `Chat ${Date.now()}`);
  
  const selectStmt = db.prepare('SELECT * FROM chats WHERE id = ?');
  return selectStmt.get(result.lastInsertRowid) as Chat;
}

export function getChatsForUser(userId: number): Chat[] {
  const stmt = db.prepare(
    'SELECT * FROM chats WHERE user_id = ? ORDER BY created_at DESC'
  );
  return stmt.all(userId) as Chat[];
}


export function getChat(chatId: number): Chat | undefined {
  const stmt = db.prepare('SELECT * FROM chats WHERE id = ?');
  return stmt.get(chatId) as Chat | undefined;
}

export function updateChatTitle(chatId: number, title: string): void {
  const stmt = db.prepare('UPDATE chats SET title = ? WHERE id = ?');
  stmt.run(title, chatId);
}

// Message operations
export function saveMessage(
  chatId: number,
  role: 'user' | 'assistant' | 'tool',
  content: string,
  fileAttachments?: Array<{ file_id?: string; filename: string; file_type: string; size: number }>
): Message {
  const fileAttachmentsJson = fileAttachments ? JSON.stringify(fileAttachments) : null;
  const stmt = db.prepare(
    'INSERT INTO messages (chat_id, role, content, file_attachments) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(chatId, role, content, fileAttachmentsJson);
  
  const selectStmt = db.prepare('SELECT * FROM messages WHERE id = ?');
  return selectStmt.get(result.lastInsertRowid) as Message;
}

export function getMessages(chatId: number): Message[] {
  const stmt = db.prepare(
    'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC'
  );
  return stmt.all(chatId) as Message[];
}

export function getLastMessage(chatId: number): Message | undefined {
  const stmt = db.prepare(
    'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1'
  );
  return stmt.get(chatId) as Message | undefined;
}

/**
 * Save a tool call message (assistant message with tool calls)
 */
export function saveToolCallMessage(
  chatId: number,
  toolCalls: any[]
): Message {
  const stmt = db.prepare(
    'INSERT INTO messages (chat_id, role, content, tool_calls) VALUES (?, ?, ?, ?)'
  );
  // Use empty string for content since tool calls are stored separately
  const result = stmt.run(chatId, 'assistant', '', JSON.stringify(toolCalls));
  
  const selectStmt = db.prepare('SELECT * FROM messages WHERE id = ?');
  return selectStmt.get(result.lastInsertRowid) as Message;
}

/**
 * Save a tool result message (tool role message)
 */
export function saveToolResultMessage(
  chatId: number,
  toolCallId: string,
  result: any,
  toolName?: string,
  metadata?: Record<string, any>
): Message {
  // Consolidate tool_name into metadata
  const consolidatedMetadata = {
    toolName: toolName || null,
    ...metadata,
  };
  
  const stmt = db.prepare(
    'INSERT INTO messages (chat_id, role, content, tool_call_id, metadata) VALUES (?, ?, ?, ?, ?)'
  );
  const resultRow = stmt.run(
    chatId,
    'tool',
    JSON.stringify(result),
    toolCallId,
    JSON.stringify(consolidatedMetadata)
  );
  
  const selectStmt = db.prepare('SELECT * FROM messages WHERE id = ?');
  return selectStmt.get(resultRow.lastInsertRowid) as Message;
}


// Auto-initialize database on module import
try {
  initializeDatabase();
} catch (error) {
  console.error('Error initializing database:', error);
}

// Export the database instance for direct access if needed
export { db };


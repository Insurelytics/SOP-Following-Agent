import Database from 'better-sqlite3';
import path from 'path';
import type { SOP, SOPRun, StepResult, SOPDocument } from './types/sop';

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
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    )
  `);

  // Create SOPs table (stores SOP templates)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      version TEXT,
      data JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create SOP runs table (tracks individual SOP executions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sop_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      sop_id TEXT NOT NULL,
      current_step_id TEXT NOT NULL,
      status TEXT DEFAULT 'in_progress',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (sop_id) REFERENCES sops(id)
    )
  `);

  // Create step results table (stores outputs from each step)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sop_step_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      step_id TEXT NOT NULL,
      user_inputs JSON,
      ai_output TEXT,
      validation_status TEXT DEFAULT 'pending',
      validation_errors JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (run_id) REFERENCES sop_runs(id) ON DELETE CASCADE
    )
  `);

  // Create SOP documents table (stores uploaded/pasted documents for runs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sop_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      document_id TEXT NOT NULL,
      content TEXT NOT NULL,
      content_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (run_id) REFERENCES sop_runs(id) ON DELETE CASCADE
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
  content: string;
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
  content: string
): Message {
  const stmt = db.prepare(
    'INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)'
  );
  const result = stmt.run(chatId, role, content);
  
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

// ============================================================================
// SOP Operations
// ============================================================================

/**
 * Save a SOP template to the database
 */
export function saveSOP(sop: SOP): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO sops (id, name, display_name, description, version, data, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  stmt.run(sop.id, sop.name, sop.displayName, sop.description, sop.version, JSON.stringify(sop));
}

/**
 * Get a SOP template by ID
 */
export function getSOP(sopId: string): SOP | undefined {
  const stmt = db.prepare('SELECT data FROM sops WHERE id = ?');
  const result = stmt.get(sopId) as { data: string } | undefined;
  if (result) {
    return JSON.parse(result.data) as SOP;
  }
  return undefined;
}

/**
 * Get all SOP templates
 */
export function getAllSOPs(): SOP[] {
  const stmt = db.prepare('SELECT data FROM sops ORDER BY created_at DESC');
  const results = stmt.all() as { data: string }[];
  return results.map(r => JSON.parse(r.data) as SOP);
}

/**
 * Create a new SOP run
 */
export function createSOPRun(chatId: number, sopId: string, firstStepId: string): SOPRun {
  const stmt = db.prepare(`
    INSERT INTO sop_runs (chat_id, sop_id, current_step_id, status)
    VALUES (?, ?, ?, 'in_progress')
  `);
  const result = stmt.run(chatId, sopId, firstStepId);
  
  const selectStmt = db.prepare('SELECT * FROM sop_runs WHERE id = ?');
  const row = selectStmt.get(result.lastInsertRowid) as any;
  return {
    id: row.id,
    chatId: row.chat_id,
    sopId: row.sop_id,
    currentStepId: row.current_step_id,
    status: row.status as 'in_progress' | 'completed' | 'paused',
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

/**
 * Get the active SOP run for a chat
 */
export function getActiveSOPRun(chatId: number): SOPRun | undefined {
  const stmt = db.prepare(`
    SELECT * FROM sop_runs 
    WHERE chat_id = ? AND status = 'in_progress'
    ORDER BY started_at DESC
    LIMIT 1
  `);
  const row = stmt.get(chatId) as any;
  if (row) {
    return {
      id: row.id,
      chatId: row.chat_id,
      sopId: row.sop_id,
      currentStepId: row.current_step_id,
      status: row.status as 'in_progress' | 'completed' | 'paused',
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  }
  return undefined;
}

/**
 * Get the most recent SOP run for a chat (including completed runs)
 */
export function getLatestSOPRun(chatId: number): SOPRun | undefined {
  const stmt = db.prepare(`
    SELECT * FROM sop_runs 
    WHERE chat_id = ?
    ORDER BY started_at DESC
    LIMIT 1
  `);
  const row = stmt.get(chatId) as any;
  if (row) {
    return {
      id: row.id,
      chatId: row.chat_id,
      sopId: row.sop_id,
      currentStepId: row.current_step_id,
      status: row.status as 'in_progress' | 'completed' | 'paused',
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  }
  return undefined;
}

/**
 * Update the current step of a SOP run
 */
export function updateSOPRunStep(runId: number, stepId: string): void {
  const stmt = db.prepare('UPDATE sop_runs SET current_step_id = ? WHERE id = ?');
  stmt.run(stepId, runId);
}

/**
 * Mark a SOP run as completed
 */
export function completeSOPRun(runId: number): void {
  const stmt = db.prepare('UPDATE sop_runs SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run('completed', runId);
}

/**
 * Save a step result
 */
export function saveStepResult(
  runId: number,
  stepId: string,
  userInputs: Record<string, any>,
  aiOutput: string
): StepResult {
  const stmt = db.prepare(`
    INSERT INTO sop_step_results (run_id, step_id, user_inputs, ai_output, validation_status)
    VALUES (?, ?, ?, ?, 'pending')
  `);
  const result = stmt.run(runId, stepId, JSON.stringify(userInputs), aiOutput);
  
  const selectStmt = db.prepare('SELECT * FROM sop_step_results WHERE id = ?');
  const row = selectStmt.get(result.lastInsertRowid) as any;
  return {
    id: row.id,
    runId: row.run_id,
    stepId: row.step_id,
    userInputs: JSON.parse(row.user_inputs || '{}'),
    aiOutput: row.ai_output,
    validationStatus: row.validation_status as 'pending' | 'valid' | 'invalid',
    validationErrors: row.validation_errors ? JSON.parse(row.validation_errors) : undefined,
    createdAt: row.created_at,
  };
}

/**
 * Get step results for a run
 */
export function getStepResults(runId: number): StepResult[] {
  const stmt = db.prepare('SELECT * FROM sop_step_results WHERE run_id = ? ORDER BY created_at ASC');
  const results = stmt.all(runId) as any[];
  return results.map(row => ({
    id: row.id,
    runId: row.run_id,
    stepId: row.step_id,
    userInputs: JSON.parse(row.user_inputs || '{}'),
    aiOutput: row.ai_output,
    validationStatus: row.validation_status as 'pending' | 'valid' | 'invalid',
    validationErrors: row.validation_errors ? JSON.parse(row.validation_errors) : undefined,
    createdAt: row.created_at,
  }));
}

/**
 * Save a SOP document
 */
export function saveSOPDocument(runId: number, documentId: string, content: string, contentType: string = 'text'): SOPDocument {
  const stmt = db.prepare(`
    INSERT INTO sop_documents (run_id, document_id, content, content_type)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(runId, documentId, content, contentType);
  
  const selectStmt = db.prepare('SELECT * FROM sop_documents WHERE id = ?');
  const row = selectStmt.get(result.lastInsertRowid) as any;
  return {
    id: row.id,
    runId: row.run_id,
    documentId: row.document_id,
    content: row.content,
    contentType: row.content_type,
    createdAt: row.created_at,
  };
}

/**
 * Get documents for a SOP run
 */
export function getSOPDocuments(runId: number): SOPDocument[] {
  const stmt = db.prepare('SELECT * FROM sop_documents WHERE run_id = ? ORDER BY created_at ASC');
  const results = stmt.all(runId) as any[];
  return results.map(row => ({
    id: row.id,
    runId: row.run_id,
    documentId: row.document_id,
    content: row.content,
    contentType: row.content_type,
    createdAt: row.created_at,
  }));
}

/**
 * Get a specific document for a run
 */
export function getSOPDocument(runId: number, documentId: string): SOPDocument | undefined {
  const stmt = db.prepare('SELECT * FROM sop_documents WHERE run_id = ? AND document_id = ?');
  const row = stmt.get(runId, documentId) as any;
  if (row) {
    return {
      id: row.id,
      runId: row.run_id,
      documentId: row.document_id,
      content: row.content,
      contentType: row.content_type,
      createdAt: row.created_at,
    };
  }
  return undefined;
}

/**
 * Seed default SOPs into the database on first launch
 */
export function seedDefaultSOPs(): void {
  try {
    // Import here to avoid circular dependency
    const { getDefaultSOPs } = require('./sops/templates');
    const defaultSOPs = getDefaultSOPs();
    
    for (const sop of defaultSOPs) {
      try {
        // Check if SOP already exists
        const existing = getSOP(sop.id);
        if (!existing) {
          saveSOP(sop);
          console.log(`Seeded SOP: ${sop.displayName}`);
        }
      } catch (error) {
        console.error(`Error seeding SOP ${sop.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error seeding default SOPs:', error);
  }
}

// Auto-initialize database on module import
try {
  initializeDatabase();
  seedDefaultSOPs();
} catch (error) {
  console.error('Error initializing database:', error);
}

// Export the database instance for direct access if needed
export { db };


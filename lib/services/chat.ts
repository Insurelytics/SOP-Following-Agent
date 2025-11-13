/**
 * Chat service - handles chat-related operations
 * Manages user chats and their lifecycle
 */

import { getOrCreateUser, createChat as createChatInDb, getChatsForUser } from '@/lib/db';
import { DEFAULT_MODEL } from '@/lib/openai';

/**
 * Gets or creates the default user and returns their chats
 * TODO: Accept authenticated user from request context instead of username parameter
 */
export function getUserChats(username: string = 'dev-test') {
  const user = getOrCreateUser(username);
  const chats = getChatsForUser(user.id);
  return Array.isArray(chats) ? chats : [];
}

/**
 * Creates a new chat for the default user
 * @param username - The username to create a chat for
 * TODO: Accept authenticated user from request context instead of username parameter
 */
export function createNewChat(username: string = 'dev-test') {
  const user = getOrCreateUser(username);
  const chat = createChatInDb(user.id, DEFAULT_MODEL);
  return chat;
}


import { Message } from '@/lib/db';

export interface MessageNode extends Message {
  children: MessageNode[];
}

/**
 * Constructs a tree of messages from a flat list
 */
export function buildMessageTree(messages: Message[]): MessageNode[] {
  const messageMap = new Map<number, MessageNode>();
  const roots: MessageNode[] = [];

  // First pass: create nodes
  messages.forEach(msg => {
    messageMap.set(msg.id, { ...msg, children: [] });
  });

  // Second pass: link children to parents
  messages.forEach(msg => {
    const node = messageMap.get(msg.id)!;
    if (msg.parent_message_id) {
      const parent = messageMap.get(msg.parent_message_id);
      if (parent) {
        parent.children.push(node);
      } else {
        // If parent not found (orphan), treat as root
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });
  
  // Sort children by creation time
  messageMap.forEach(node => {
      node.children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  });

  return roots.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

/**
 * Gets the full thread (path) from root to a specific leaf message
 */
export function getThread(leafId: number, messages: Message[]): Message[] {
  const messageMap = new Map<number, Message>();
  messages.forEach(msg => messageMap.set(msg.id, msg));

  const thread: Message[] = [];
  let currentId: number | undefined | null = leafId;

  while (currentId) {
    const msg = messageMap.get(currentId);
    if (!msg) break;
    thread.unshift(msg);
    currentId = msg.parent_message_id;
  }

  return thread;
}

/**
 * Gets the latest leaf message ID for the default/latest branch
 * If multiple branches exist, it follows the most recently created path
 */
export function getLatestLeafId(messages: Message[]): number | undefined {
  if (messages.length === 0) return undefined;

  // Build a map of id -> children
  const childrenMap = new Map<number, Message[]>();
  const messageMap = new Map<number, Message>();
  const roots: Message[] = [];

  messages.forEach(msg => {
    messageMap.set(msg.id, msg);
    if (msg.parent_message_id) {
      if (!childrenMap.has(msg.parent_message_id)) {
        childrenMap.set(msg.parent_message_id, []);
      }
      childrenMap.get(msg.parent_message_id)!.push(msg);
    } else {
      roots.push(msg);
    }
  });

  // If no messages, return undefined
  if (roots.length === 0) return undefined;

  // Start from the last root (latest conversation start)
  let current = roots[roots.length - 1];

  // Walk down choosing the last child (latest branch)
  while (true) {
    const children = childrenMap.get(current.id);
    if (!children || children.length === 0) {
      return current.id;
    }
    // Sort children by ID (proxy for creation time usually) or explicit created_at
    children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    current = children[children.length - 1];
  }
}

/**
 * Branch info for navigation
 */
export interface BranchInfo {
  currentBranchIndex: number;
  totalBranches: number;
  prevBranchId?: number;
  nextBranchId?: number;
}

/**
 * Gets branch navigation info for a specific message
 * Returns info about its siblings (messages sharing the same parent)
 */
export function getBranchInfo(messageId: number, messages: Message[]): BranchInfo | null {
  const currentMsg = messages.find(m => m.id === messageId);
  if (!currentMsg) return null;

  // Find siblings
  const siblings = messages.filter(m => 
    (m.parent_message_id === currentMsg.parent_message_id) &&
    (m.parent_message_id !== undefined || (m.parent_message_id === null && currentMsg.parent_message_id === null))
  ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (siblings.length <= 1) return null;

  const index = siblings.findIndex(m => m.id === messageId);
  
  return {
    currentBranchIndex: index + 1, // 1-based for UI
    totalBranches: siblings.length,
    prevBranchId: index > 0 ? siblings[index - 1].id : undefined,
    nextBranchId: index < siblings.length - 1 ? siblings[index + 1].id : undefined
  };
}

/**
 * Find the leaf node of the branch containing a specific message,
 * following the "latest" path from that message downwards.
 */
export function getBranchLeafId(messageId: number, messages: Message[]): number {
  const childrenMap = new Map<number, Message[]>();
  messages.forEach(msg => {
    if (msg.parent_message_id) {
      if (!childrenMap.has(msg.parent_message_id)) {
        childrenMap.set(msg.parent_message_id, []);
      }
      childrenMap.get(msg.parent_message_id)!.push(msg);
    }
  });

  let currentId = messageId;
  while (true) {
    const children = childrenMap.get(currentId);
    if (!children || children.length === 0) {
      return currentId;
    }
    // Follow latest child
    children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    currentId = children[children.length - 1].id;
  }
}


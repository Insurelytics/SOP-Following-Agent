I will implement message editing and branching using a tree-based structure.

### 1. Database & Backend (`lib/db.ts`, `app/api/chat/route.ts`)
- **Schema**: Add `parent_message_id` to the `messages` table.
- **Migration**: Link existing sequential messages (msg N points to msg N-1) so current chats act as a single branch.
- **API**: Update `POST /api/chat` to accept a `parentMessageId`.
  - Normal send: Parent is the current leaf message.
  - Edit: Parent is the *same parent* as the message being edited (creating a sibling).

### 2. Frontend Logic (`lib/utils/message-tree.ts`)
- Create a utility to process the flat list of all messages into a navigable tree.
- **Functions**:
  - `getThread(leafId, allMessages)`: Returns the linear conversation history for a specific branch.
  - `getBranchInfo(messageId, allMessages)`: Returns sibling count and current index for navigation (e.g., "2 of 3").

### 3. UI Implementation (`components/ChatInterface.tsx`, `components/MessageList.tsx`)
- **State**: Track `currentLeafId` (the tip of the current branch) instead of just a list of messages.
- **Navigation**: Add `<` and `>` arrows next to messages that have multiple versions (branches).
- **Editing**:
  - Add an "Edit" icon to user messages.
  - When submitted, it creates a new message branch at that point.
  - The chat automatically switches to the new branch and regenerates the AI response.


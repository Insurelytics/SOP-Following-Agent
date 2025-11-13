# AI Chat Starter

A minimal ChatGPT-like chat interface with streaming responses and tool support.

## What's Included

- **Chat Interface**: Clean, modern UI for multi-turn conversations
- **Streaming Responses**: Real-time response streaming with Server-Sent Events
- **Tool Support**: Example "add" tool demonstrating function calling capability
- **File Uploads**: Support for image and text file attachments
- **Chat History**: Persistent storage of conversations
- **Theme Picker**: Light/dark theme support

## Tech Stack

- **Frontend**: Next.js 14 + React 18 + Tailwind CSS
- **Database**: SQLite (better-sqlite3)
- **AI**: OpenAI API with function calling
- **Language**: TypeScript

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

## Project Structure

- `/app` - Next.js app router pages and API routes
- `/components` - React UI components (ChatInterface, Sidebar, etc.)
- `/lib` - Core services (database, OpenAI integration, chat logic)

## Environment Variables

```
OPENAI_API_KEY=your_key_here
MODEL=gpt-5-nano
```

## Using as a Starter

This is designed as a minimal starter for building chat-based applications. To customize:

1. **Add Tools**: Edit `lib/openai.ts` to define new tools and `lib/services/tools.ts` to implement them
2. **Modify System Prompt**: Update `lib/services/prompt.ts` to customize AI behavior
3. **Extend Database**: Add new tables/operations to `lib/db.ts` as needed
4. **Design Components**: Customize styling in components and `app/globals.css`

## Database Schema

The starter includes a clean schema with:
- **users**: User accounts
- **chats**: Conversation threads
- **messages**: Individual messages with support for tool calls and file attachments

For new projects, simply delete `chat.db` and the schema will be recreated on startup.

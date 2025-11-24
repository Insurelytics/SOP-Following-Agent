# SOP-Following Agent

A ChatGPT-like interface for following Standard Operating Procedures with AI assistance.

## What Makes This Different

Unlike traditional chat interfaces, this agent is **grounded in structured workflows**. The key differentiators are:

- **SOP-Aware**: Users select a Standard Operating Procedure, and the AI follows it step-by-step
- **Smart Information Gathering**: The AI uses structured forms to request exactly what it needs, rather than generic conversation
- **Editable SOPs**: Users can modify procedures in real-time, and the AI adapts to follow the updated workflow
- **Tool Integration**: The AI can execute tools, generate structured results, and request information—all guided by the SOP

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

## Running with Docker

Build and run with plain Docker:

```bash
docker build -t sop-following-agent .
docker run --rm -p 3001:3001 \
  -e OPENAI_API_KEY=your_key_here \
  -e MODEL=gpt-5-nano \
  -v "$(pwd)/chat.db:/app/chat.db" \
  sop-following-agent
```

Or use Docker Compose:

```bash
OPENAI_API_KEY=your_key_here MODEL=gpt-5-nano docker compose up --build
```

## Project Structure

- `/app` - Next.js app router pages and API routes
- `/components` - React UI components (ChatInterface, Sidebar, etc.)
- `/lib` - Core services (database, OpenAI integration, chat logic)
- `/scripts` - Database initialization

## Environment Variables

```
OPENAI_API_KEY=your_key_here
MODEL=gpt-5-nano
```

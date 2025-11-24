FROM node:20-slim

WORKDIR /app

# Install build tools for native modules like better-sqlite3
RUN apt-get update && \
  apt-get install -y --no-install-recommends python3 make g++ && \
  rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build the Next.js app
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001

# Expose app port
EXPOSE 3001

# Ensure the SQLite database file exists (will be bind-mounted in most setups)
VOLUME ["/app/chat.db"]

# Start the production server
CMD ["npm", "start"]



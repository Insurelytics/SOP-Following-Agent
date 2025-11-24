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

# Start the production server
CMD ["npm", "start"]



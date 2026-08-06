# STAGE 1: Builder
FROM node:26-alpine AS builder
RUN apk add --no-cache python3 make g++ gcc
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm prune --production

# STAGE 2: Lightweight Runner
FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy all pruned application files from builder
COPY --from=builder /app ./

# Adjust this to match your entry point (e.g., index.js, main.js, bot.js)
CMD ["node", "index.js"]

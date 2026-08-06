# ==========================================
# STAGE 1: Build & Compile Native Dependencies
# ==========================================
FROM node:20-alpine AS builder

# Install build tools required for better-sqlite3 / native modules
RUN apk add --no-cache python3 make g++ gcc

WORKDIR /app

# Copy package manifests first (better layer caching)
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy full application source code
COPY . .

# If you have a build step (e.g. TypeScript / Bundle), run it here:
# RUN npm run build

# Prune non-production dependencies to keep node_modules minimal
RUN npm prune --production

# ==========================================
# STAGE 2: Lightweight Production Image
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy only compiled/installed node_modules and source from builder stage
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

EXPOSE 3000

# Run the app directly with node
CMD ["node", "index.js"]

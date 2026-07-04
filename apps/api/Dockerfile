# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install turbo globally to filter workspaces
RUN npm install -g turbo

# Copy all files
COPY . .

# Prune to just the API workspace and its dependencies
RUN turbo prune @dental/api --docker

# Production dependencies stage
FROM node:22-alpine AS installer
WORKDIR /app

# Copy pruned lockfiles and package.json
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json

# Install dependencies using clean install
RUN npm ci

# Copy the source code
COPY --from=builder /app/out/full/ .

# Build the project
RUN npx turbo run build --filter=@dental/api

# Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

# Copy the built output and dependencies
COPY --from=installer /app .

# Expose API port
EXPOSE 4100

# Start the Fastify server
WORKDIR /app/apps/api
CMD ["node", "dist/server.js"]

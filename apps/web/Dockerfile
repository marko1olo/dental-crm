# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install turbo globally to filter workspaces
RUN npm install -g turbo

# Copy all files
COPY . .

# Prune to just the web workspace and its dependencies
RUN turbo prune @dental/web --docker

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
RUN npx turbo run build --filter=@dental/web

# Runner stage (Nginx)
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the built output from Vite
COPY --from=installer /app/apps/web/dist /usr/share/nginx/html

# Add a custom nginx config to handle React Router history API and proxy to API
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

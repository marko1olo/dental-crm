# ==============================================================================
# DENTE BOOKING SERVER & PWA PORTAL DOCKERFILE
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Install security updates & wget for container healthcheck
RUN apk add --no-cache ca-certificates wget

# Copy package specifications
COPY package.json ./

# Install production dependencies cleanly
RUN npm install --omit=dev --no-audit --no-fund

# Copy backend server code and static frontends
COPY server.js ./
COPY public/ ./public/

# Create persistent storage folder for offline queues
RUN mkdir -p /app/data && chown -R node:node /app

# Expose internal service port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

# Non-root user execution
USER node

CMD ["node", "server.js"]

# ==============================================================================
# DENTE CLOUD RELAY DOCKERFILE
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Install security certificates & curl/wget for healthchecks
RUN apk add --no-cache ca-certificates wget

# Copy package descriptors and install production dependencies
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy application source
COPY server.js ./

# Expose internal relay port
EXPOSE 4000

# Healthcheck
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

# Non-root user execution
USER node

CMD ["node", "server.js"]

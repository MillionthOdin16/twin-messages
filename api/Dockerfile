FROM node:20-alpine

WORKDIR /app

# Force rebuild cache bust
ARG BUILD_DATE=2026-02-25-v2

COPY package.json ./
RUN npm install --production

COPY server.js ./
COPY websocket-server-v3.js ./

# Health check for Coolify
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

EXPOSE 3000

# Graceful shutdown handling
ENV NODE_OPTIONS="--max-old-space-size=512"

CMD ["node", "websocket-server-v3.js"]

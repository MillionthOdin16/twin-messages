FROM node:20-alpine

WORKDIR /app

# Force rebuild cache bust
ARG BUILD_DATE=2026-02-25-v2

COPY package.json ./
RUN npm install --production

COPY server.js ./
COPY websocket-server-v3.js ./

EXPOSE 3000

CMD ["node", "websocket-server-v3.js"]

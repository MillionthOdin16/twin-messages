FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY server.js ./
COPY websocket-server-v3.js ./

EXPOSE 3000

CMD ["node", "websocket-server-v3.js"]

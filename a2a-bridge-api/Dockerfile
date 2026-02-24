FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY websocket-server-v3.js ./websocket-server.js

EXPOSE 3000

CMD ["node", "websocket-server.js"]

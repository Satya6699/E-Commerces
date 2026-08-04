FROM node:18-alpine

WORKDIR /app

COPY services/api-gateway/package*.json ./

RUN npm ci --only=production

COPY services/api-gateway/ /app/services/api-gateway/
COPY shared/ /app/shared/
COPY *.html css.css plants-database.json ./
COPY js ./js
COPY public ./public

EXPOSE 3000

CMD ["node", "services/api-gateway/server.js"]

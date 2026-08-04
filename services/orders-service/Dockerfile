FROM node:18-alpine

WORKDIR /app

COPY services/orders-service/package*.json ./

RUN npm ci --only=production

COPY services/orders-service/ /app/services/orders-service/
COPY shared/ /app/shared/

EXPOSE 3003

CMD ["node", "services/orders-service/server.js"]

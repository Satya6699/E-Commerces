FROM node:18-alpine

WORKDIR /app

COPY services/cart-service/package*.json ./

RUN npm ci --only=production

COPY services/cart-service/ /app/services/cart-service/
COPY shared/ /app/shared/

EXPOSE 3004

CMD ["node", "services/cart-service/server.js"]

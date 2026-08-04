FROM node:18-alpine

WORKDIR /app

COPY services/cart-service/package*.json ./

RUN npm ci --only=production

COPY services/cart-service/ ./
COPY shared/ ../shared/

EXPOSE 3004

CMD ["npm", "start"]

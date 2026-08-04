FROM node:18-alpine

WORKDIR /app

COPY services/orders-service/package*.json ./

RUN npm ci --only=production

COPY services/orders-service/ ./
COPY shared/ ../shared/

EXPOSE 3003

CMD ["npm", "start"]

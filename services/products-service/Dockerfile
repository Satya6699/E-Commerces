FROM node:18-alpine

WORKDIR /app

COPY services/products-service/package*.json ./

RUN npm ci --only=production

COPY services/products-service/ /app/services/products-service/
COPY shared/ /app/shared/

EXPOSE 3002

CMD ["node", "services/products-service/server.js"]

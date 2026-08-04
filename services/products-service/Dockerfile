FROM node:18-alpine

WORKDIR /app

COPY services/products-service/package*.json ./

RUN npm ci --only=production

COPY services/products-service/ ./
COPY shared/ ../shared/

EXPOSE 3002

CMD ["npm", "start"]

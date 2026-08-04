FROM node:18-alpine

WORKDIR /app

COPY services/admin-service/package*.json ./

RUN npm ci --only=production

COPY services/admin-service/ ./
COPY shared/ ../shared/

EXPOSE 3005

CMD ["npm", "start"]

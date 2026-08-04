FROM node:18-alpine

WORKDIR /app

COPY services/admin-service/package*.json ./

RUN npm ci --only=production

COPY services/admin-service/ /app/services/admin-service/
COPY shared/ /app/shared/

EXPOSE 3005

CMD ["node", "services/admin-service/server.js"]

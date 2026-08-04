FROM node:18-alpine

WORKDIR /app

COPY services/auth-service/package*.json ./

RUN npm ci --only=production

COPY services/auth-service/ /app/services/auth-service/
COPY shared/ /app/shared/

EXPOSE 3001

CMD ["node", "services/auth-service/server.js"]

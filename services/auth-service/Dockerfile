FROM node:18-alpine

WORKDIR /app

COPY services/auth-service/package*.json ./

RUN npm ci --only=production

COPY services/auth-service/ ./
COPY shared/ ../shared/

EXPOSE 3001

CMD ["npm", "start"]

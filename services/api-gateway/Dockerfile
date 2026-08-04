FROM node:18-alpine

WORKDIR /app

COPY services/api-gateway/package*.json ./

RUN npm ci --only=production

COPY services/api-gateway/ ./
COPY shared/ ../shared/
COPY index.html login.html register.html ./

EXPOSE 3000

CMD ["npm", "start"]

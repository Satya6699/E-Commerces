const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
require('dotenv').config();
const logger = require('../../shared/logger');

const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../')));

// Logging middleware
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// Service URLs
const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const PRODUCTS_SERVICE = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:3002';
const ORDERS_SERVICE = process.env.ORDERS_SERVICE_URL || 'http://localhost:3003';
const CART_SERVICE = process.env.CART_SERVICE_URL || 'http://localhost:3004';
const ADMIN_SERVICE = process.env.ADMIN_SERVICE_URL || 'http://localhost:3005';

// Proxy routes to microservices
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE,
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/api/auth' }
}));

app.use('/api/products', createProxyMiddleware({
  target: PRODUCTS_SERVICE,
  changeOrigin: true,
  pathRewrite: { '^/api/products': '/api/products' }
}));

app.use('/api/orders', createProxyMiddleware({
  target: ORDERS_SERVICE,
  changeOrigin: true,
  pathRewrite: { '^/api/orders': '/api/orders' }
}));

app.use('/api/cart', createProxyMiddleware({
  target: CART_SERVICE,
  changeOrigin: true,
  pathRewrite: { '^/api/cart': '/api/cart' }
}));

app.use('/api/admin', createProxyMiddleware({
  target: ADMIN_SERVICE,
  changeOrigin: true,
  pathRewrite: { '^/api/admin': '/api/admin' }
}));

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`🚀 API Gateway running on http://localhost:${PORT}`);
  logger.info(`Auth Service: ${AUTH_SERVICE}`);
  logger.info(`Products Service: ${PRODUCTS_SERVICE}`);
  logger.info(`Orders Service: ${ORDERS_SERVICE}`);
  logger.info(`Cart Service: ${CART_SERVICE}`);
  logger.info(`Admin Service: ${ADMIN_SERVICE}`);
});

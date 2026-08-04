const express = require('express');
require('dotenv').config();
const { authenticateRequest, requireAdmin } = require('../../shared/jwt-utils');
const { callService } = require('../../shared/service-client');
const logger = require('../../shared/logger');

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin' });
});

// Dashboard stats (admin only)
app.get('/api/admin/stats', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    // Call other services to get data
    const allOrdersResponse = await callService('orders', 'GET', '/api/orders', null, 
      { 'Authorization': req.headers['authorization'] });
    
    const productsResponse = await callService('products', 'GET', '/api/products');

    res.json({
      success: true,
      stats: {
        totalOrders: allOrdersResponse.orders?.length || 0,
        totalProducts: productsResponse.products?.length || 0,
        totalRevenue: (allOrdersResponse.orders || []).reduce((sum, o) => sum + (o.total || 0), 0)
      }
    });
  } catch (err) {
    logger.error('Get stats error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    // This would need a users service or direct DB access
    res.json({ success: true, users: [] });
  } catch (err) {
    logger.error('Get users error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get auth logs for email (admin only)
app.get('/api/admin/auth-logs/:email', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    // Call auth service to get logs
    const response = await callService('auth', 'GET', `/api/admin/auth-logs/${req.params.email}`, null,
      { 'Authorization': req.headers['authorization'] });
    
    res.json({ success: true, logs: response.logs });
  } catch (err) {
    logger.error('Get auth logs error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch auth logs' });
  }
});

// Get all auth logs (admin only)
app.get('/api/admin/auth-logs', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    // Call auth service
    const response = await callService('auth', 'GET', '/api/admin/auth-logs', null,
      { 'Authorization': req.headers['authorization'] });
    
    res.json({ success: true, logs: response.logs });
  } catch (err) {
    logger.error('Get all auth logs error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch auth logs' });
  }
});

const PORT = process.env.ADMIN_SERVICE_PORT || 3005;
app.listen(PORT, () => {
  logger.info(`Admin Service running on http://localhost:${PORT}`);
});

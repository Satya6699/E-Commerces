const express = require('express');
require('dotenv').config();
const { authenticateRequest, requireAdmin } = require('../../shared/jwt-utils');
const logger = require('../../shared/logger');
const db = require('./db');

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'orders' });
});

// Create order
app.post('/api/orders', authenticateRequest, async (req, res) => {
  try {
    const { items, total, address, paymentMethod } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain items' });
    }

    const order = await db.createOrder({
      userId: req.user.id,
      userEmail: req.user.email,
      items,
      total,
      address,
      paymentMethod,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    });

    logger.info('Order created', { orderId: order._id, userId: req.user.id });
    res.status(201).json({ success: true, order });
  } catch (err) {
    logger.error('Create order error', { error: err.message });
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get user's orders
app.get('/api/orders/user/:userId', authenticateRequest, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const orders = await db.getOrdersByUserId(req.params.userId);
    res.json({ success: true, orders });
  } catch (err) {
    logger.error('Get user orders error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID
app.get('/api/orders/:id', authenticateRequest, async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ success: true, order });
  } catch (err) {
    logger.error('Get order error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order status (admin only)
app.patch('/api/orders/:id/status', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const order = await db.updateOrderStatus(req.params.id, status);
    logger.info('Order status updated', { orderId: req.params.id, status });
    res.json({ success: true, order });
  } catch (err) {
    logger.error('Update order status error', { error: err.message });
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Cancel order
app.post('/api/orders/:id/cancel', authenticateRequest, async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot cancel order with status: ' + order.status });
    }

    const updatedOrder = await db.updateOrderStatus(req.params.id, 'cancelled');
    logger.info('Order cancelled', { orderId: req.params.id });
    res.json({ success: true, order: updatedOrder });
  } catch (err) {
    logger.error('Cancel order error', { error: err.message });
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Get all orders (admin only)
app.get('/api/orders', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    const orders = await db.getAllOrders();
    res.json({ success: true, orders, total: orders.length });
  } catch (err) {
    logger.error('Get all orders error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

const PORT = process.env.ORDERS_SERVICE_PORT || 3003;
app.listen(PORT, () => {
  logger.info(`Orders Service running on http://localhost:${PORT}`);
});

const express = require('express');
require('dotenv').config();
const { authenticateRequest } = require('../../shared/jwt-utils');
const logger = require('../../shared/logger');
const db = require('./db');

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cart' });
});

// Get user's cart
app.get('/api/cart', authenticateRequest, async (req, res) => {
  try {
    const cart = await db.getCart(req.user.id);
    res.json({ success: true, cart: cart || { userId: req.user.id, items: [], total: 0 } });
  } catch (err) {
    logger.error('Get cart error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Add to cart
app.post('/api/cart/add', authenticateRequest, async (req, res) => {
  try {
    const { productId, quantity, price, name } = req.body;
    
    if (!productId || !quantity || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cart = await db.addToCart(req.user.id, {
      productId,
      name,
      quantity: parseInt(quantity),
      price: parseFloat(price)
    });

    logger.info('Item added to cart', { userId: req.user.id, productId });
    res.json({ success: true, cart });
  } catch (err) {
    logger.error('Add to cart error', { error: err.message });
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// Update cart item
app.put('/api/cart/update/:productId', authenticateRequest, async (req, res) => {
  try {
    const { quantity } = req.body;
    
    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }

    const cart = await db.updateCartItem(req.user.id, req.params.productId, quantity);
    logger.info('Cart item updated', { userId: req.user.id, productId: req.params.productId });
    res.json({ success: true, cart });
  } catch (err) {
    logger.error('Update cart error', { error: err.message });
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// Remove from cart
app.delete('/api/cart/remove/:productId', authenticateRequest, async (req, res) => {
  try {
    const cart = await db.removeFromCart(req.user.id, req.params.productId);
    logger.info('Item removed from cart', { userId: req.user.id, productId: req.params.productId });
    res.json({ success: true, cart });
  } catch (err) {
    logger.error('Remove from cart error', { error: err.message });
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

// Clear cart
app.delete('/api/cart/clear', authenticateRequest, async (req, res) => {
  try {
    await db.clearCart(req.user.id);
    logger.info('Cart cleared', { userId: req.user.id });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    logger.error('Clear cart error', { error: err.message });
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

const PORT = process.env.CART_SERVICE_PORT || 3004;
app.listen(PORT, () => {
  logger.info(`Cart Service running on http://localhost:${PORT}`);
});

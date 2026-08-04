const express = require('express');
require('dotenv').config();
const { authenticateRequest } = require('../../shared/jwt-utils');
const logger = require('../../shared/logger');
const db = require('./db');

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'products' });
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await db.getProducts();
    res.json({ success: true, products });
  } catch (err) {
    logger.error('Get products error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (err) {
    logger.error('Get product error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Search products
app.get('/api/products/search/:query', async (req, res) => {
  try {
    const products = await db.searchProducts(req.params.query);
    res.json({ success: true, products });
  } catch (err) {
    logger.error('Search products error', { error: err.message });
    res.status(500).json({ error: 'Search failed' });
  }
});

// Create product (admin only)
app.post('/api/products', authenticateRequest, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, price, image, description, category } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const product = await db.createProduct({
      name,
      price,
      image: image || 'default.jpg',
      description: description || '',
      category: category || 'plants',
      created_at: new Date(),
      updated_at: new Date()
    });

    logger.info('Product created', { productId: product._id, name });
    res.status(201).json({ success: true, product });
  } catch (err) {
    logger.error('Create product error', { error: err.message });
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product (admin only)
app.put('/api/products/:id', authenticateRequest, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const product = await db.updateProduct(req.params.id, {
      ...req.body,
      updated_at: new Date()
    });

    logger.info('Product updated', { productId: req.params.id });
    res.json({ success: true, product });
  } catch (err) {
    logger.error('Update product error', { error: err.message });
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (admin only)
app.delete('/api/products/:id', authenticateRequest, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await db.deleteProduct(req.params.id);
    logger.info('Product deleted', { productId: req.params.id });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    logger.error('Delete product error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

const PORT = process.env.PRODUCTS_SERVICE_PORT || 3002;
app.listen(PORT, () => {
  logger.info(`Products Service running on http://localhost:${PORT}`);
});
